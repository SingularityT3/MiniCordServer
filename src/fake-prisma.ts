import { Collection, Db, MongoClient, ObjectId } from "mongodb";

function fixId(obj: any) {
  if (obj?._id) {
    obj.id = obj._id.toHexString();
    delete obj._id;
  }
  return obj;
}

function transformWhere(where: any): any {
  if (!where) {
    return {};
  }

  const transformed: any = {};
  for (const key in where) {
    if (key === "OR") {
      transformed.$or = where[key].map(transformWhere);
    } else if (key === "AND") {
      transformed.$and = where[key].map(transformWhere);
    } else if (key === "NOT") {
      if (Array.isArray(where[key])) {
        transformed.$nor = where[key].map(transformWhere);
      } else {
        transformed.$nor = [transformWhere(where[key])];
      }
    } else if (key === "id") {
      if (where[key]?.in) {
        transformed._id = {
          $in: where[key].in.map((id: string) => new ObjectId(id)),
        };
      } else {
        transformed._id = new ObjectId(where[key]);
      }
    } else if (
      key === "userId" ||
      key === "conversationId" ||
      key === "senderId" ||
      key === "recipientId"
    ) {
      if (ObjectId.isValid(where[key])) {
        // Create an OR condition to match either ObjectId or string
        transformed.$or = [
          { [key]: new ObjectId(where[key]) },
          { [key]: where[key] },
        ];
      } else {
        transformed[key] = where[key];
      }
    } else if (where[key]?.in) {
      transformed[key] = { $in: where[key].in };
    } else if (where[key]?.not) {
      transformed[key] = { $ne: where[key].not };
    } else {
      transformed[key] = where[key];
    }
  }
  return transformed;
}

function createPrismaModel(collection: Collection) {
  return {
    async findUnique(query: any) {
      const projection: any = {};
      if (query.select) {
        for (const field in query.select) {
          if (query.select[field]) {
            projection[field === "id" ? "_id" : field] = 1;
          }
        }
      }
      const result = await collection.findOne(transformWhere(query.where), {
        projection,
      });
      return fixId(result);
    },
    async findMany(query: any) {
      const projection: any = {};
      if (query.select) {
        for (const field in query.select) {
          if (query.select[field]) {
            projection[field === "id" ? "_id" : field] = 1;
          }
        }
      }
      const findQuery = collection.find(transformWhere(query.where), {
        projection,
      });

      if (query.orderBy) {
        findQuery.sort(query.orderBy);
      }
      if (query.skip) {
        findQuery.skip(query.skip);
      }
      if (query.take) {
        findQuery.limit(Math.abs(query.take));
      }
      if (query.cursor) {
        // This is a simplified implementation of cursor pagination
        if (query.take > 0) {
          findQuery.filter({ _id: { $gt: new ObjectId(query.cursor.id) } });
        } else {
          findQuery.filter({ _id: { $lt: new ObjectId(query.cursor.id) } });
        }
      }

      const results = await findQuery.toArray();
      return results.map(fixId);
    },
    async findFirst(query: any) {
      const projection: any = {};
      if (query.select) {
        for (const field in query.select) {
          if (query.select[field]) {
            projection[field === "id" ? "_id" : field] = 1;
          }
        }
      }
      const result = await collection.findOne(transformWhere(query.where), {
        projection,
      });
      return fixId(result);
    },
    async create(query: any) {
      const result = await collection.insertOne(query.data);
      return fixId({ ...query.data, _id: result.insertedId });
    },
    async createMany(query: any) {
      return collection.insertMany(query.data);
    },
    async update(query: any) {
      return collection.updateOne(transformWhere(query.where), {
        $set: query.data,
      });
    },
    async delete(query: any) {
      return collection.deleteOne(transformWhere(query.where));
    },
  };
}

class FakePrisma {
  private client!: MongoClient;
  public db!: Db;

  user: any;
  friend: any;
  conversation: any;
  conversationMember: any;
  message: any;

  constructor() {}

  async connect() {
    this.client = new MongoClient(process.env.DATABASE_URL!);
    await this.client.connect();
    this.db = this.client.db();

    this.user = createPrismaModel(this.db.collection("User"));
    this.friend = createPrismaModel(this.db.collection("Friend"));
    this.conversation = createPrismaModel(this.db.collection("Conversation"));
    this.conversationMember = createPrismaModel(
      this.db.collection("ConversationMember")
    );
    const messageCollection = this.db.collection("Message");
    this.message = {
      ...createPrismaModel(messageCollection),
      async findMany(query: any) {
        const projection: any = {};
        if (query.select) {
          for (const field in query.select) {
            if (query.select[field]) {
              projection[field === "id" ? "_id" : field] = 1;
            }
          }
        }

        // Helper: normalize orderBy object (map "id" -> "_id", "asc"/"desc" -> 1/-1)
        const normalizeOrder = (orderBy: any) => {
          const out: any = {};
          if (!orderBy) return out;
          for (const key in orderBy) {
            const mappedKey = key === "id" ? "_id" : key;
            const v = orderBy[key];
            if (v === "asc" || v === 1) out[mappedKey] = 1;
            else out[mappedKey] = -1;
          }
          return out;
        };

        // clientSort: how the caller expects results (from orderBy or default)
        let clientSort = normalizeOrder(query.orderBy);
        // If caller provided no orderBy, assume default by _id desc (latest first)
        if (Object.keys(clientSort).length === 0) {
          clientSort = { _id: -1 };
        }

        // If no cursor provided (no before/after), we must return latest-first.
        const hasCursor = !!query.cursor?.id;
        let querySort: any;
        let reverseResults = false;

        if (!hasCursor) {
          // Requirement: when there is no before/after, return latest messages first
          querySort = { _id: -1 };
          reverseResults = false;
        } else {
          // Cursor present — follow Prisma semantics:
          // - If take < 0: reverse the clientSort for the DB query, then reverse results in memory
          if (query.take && query.take < 0) {
            querySort = {};
            for (const k in clientSort) {
              querySort[k] = clientSort[k] === 1 ? -1 : 1;
            }
            reverseResults = true;
          } else {
            querySort = { ...clientSort };
            reverseResults = false;
          }
        }

        // Build filter from where
        const filter = transformWhere(query.where) || {};

        // Apply cursor filter if provided.
        if (hasCursor) {
          const cursorId = new ObjectId(query.cursor.id);

          // We only support id cursor here (Prisma usage shows cursor.id).
          // Decide operator based on the direction of the querySort for the primary key.
          // Use the first sort key (commonly "_id")
          const firstKey = Object.keys(querySort)[0] || "_id";
          const dir = querySort[firstKey] === 1 ? 1 : -1;
          const op = dir === 1 ? "$gte" : "$lte";

          // If the cursor field is "_id" we must use ObjectId
          if (firstKey === "_id") {
            filter["_id"] = { [op]: cursorId };
          } else {
            // If sorting by another field, we'll assume cursor provides that value.
            // For safety, if cursor only provides id, you might want to compare by _id instead.
            filter[firstKey] = {
              [op]: query.cursor[firstKey] ?? query.cursor.id,
            };
          }
        }

        // Skip & limit
        const skip = query.skip ? Number(query.skip) : 0;
        const limit = query.take ? Math.abs(Number(query.take)) : 0;

        // OPTIONAL: debug logging to see what's actually sent to Mongo
        // console.debug({ filter, querySort, skip, limit, reverseResults });

        // Execute find with built filter + projection
        const cursor = messageCollection.find(filter, { projection });

        if (Object.keys(querySort).length) {
          cursor.sort(querySort);
        }
        if (skip) cursor.skip(skip);
        if (limit) cursor.limit(limit);

        let results = await cursor.toArray();

        // If we reversed DB sort to implement negative take, flip the results back.
        if (reverseResults) {
          results = results.reverse();
        }

        return results.map(fixId);
      },
    };
  }
}

export default new FakePrisma();
