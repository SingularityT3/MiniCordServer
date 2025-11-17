# MiniCord REST API Documentation

This document outlines the REST API endpoints for the MiniCord server.

## Authentication

Many endpoints require authentication. This is done via a JSON Web Token (JWT) passed in the `Authorization` header as a Bearer token.

`Authorization: Bearer <token>`

## API Endpoints

### Auth

-   **`GET /auth/checkuser/:username`**
    -   Checks if a username is available.
    -   **Parameters:**
        -   `username` (URL parameter): The username to check.
    -   **Responses:**
        -   `200 OK`: `{ "available": boolean }`
        -   **Example:**
            ```json
            {
                "available": true
            }
            ```
-   **`POST /auth/signup`**
    -   Creates a new user.
    -   **Body:**
        -   `username` (string, required)
        -   `password` (string, required, min 8 characters)
    -   **Responses:**
        -   `201 Created`
        -   `400 Bad Request`: If password is too short or fields are missing.
        -   `409 Conflict`: If username is already taken.
-   **`POST /auth/login`**
    -   Logs in a user.
    -   **Body:**
        -   `username` (string, required)
        -   `password` (string, required)
    -   **Responses:**
        -   `200 OK`: Returns a JWT token and the user object.
        -   **Example:**
            ```json
            {
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "user": {
                    "id": "clsdjflkjsdflkjsdflkjsdf",
                    "username": "testuser"
                }
            }
            ```
        -   `400 Bad Request`: If user does not exist or fields are missing.
        -   `401 Unauthorized`: If password is incorrect.

### Users

-   **`GET /users/self`**
    -   Gets the currently authenticated user's profile.
    -   **Authentication:** Required.
    -   **Responses:**
        -   `200 OK`: The user object.
        -   **Example:**
            ```json
            {
                "id": "clsdjflkjsdflkjsdflkjsdf",
                "username": "testuser"
            }
            ```
-   **`GET /users/by-username/:username`**
    -   Gets a user by their username.
    -   **Parameters:**
        -   `username` (URL parameter): The username to look up.
    -   **Responses:**
        -   `200 OK`: The user object.
        -   **Example:**
            ```json
            {
                "id": "clsdjflkjsdflkjsdflkjsdf",
                "username": "otheruser"
            }
            ```
        -   `404 Not Found`: If the user does not exist.
-   **`GET /users/:id`**
    -   Gets a user by their ID.
    -   **Parameters:**
        -   `id` (URL parameter): The user's ID.
    -   **Responses:**
        -   `200 OK`: The user object.
        -   **Example:**
            ```json
            {
                "id": "clsdjflkjsdflkjsdflkjsdf",
                "username": "otheruser"
            }
            ```
        -   `400 Bad Request`: If the ID is invalid.
        -   `404 Not Found`: If the user does not exist.

-   **`POST /users/:id/profile`**
    -   Uploads a profile picture for the specified user.
    -   **Authentication:** Required.
    -   **Parameters:**
        -   `id` (URL parameter): The ID of the user to upload the profile picture for.
    -   **Body:**
        -   `avatar` (file, required): The image file to upload.
    -   **Responses:**
        -   `201 Created`
        -   `400 Bad Request`: If no file is uploaded or the file is not an image.
        -   `403 Forbidden`: If the authenticated user ID does not match the ID in the URL.

-   **`GET /users/:id/profile`**
    -   Retrieves the profile picture for the specified user.
    -   **Parameters:**
        -   `id` (URL parameter): The ID of the user whose profile picture to retrieve.
    -   **Responses:**
        -   `200 OK`: Returns the image file.
        -   `404 Not Found`: If the profile image does not exist.

### Friends

All endpoints under `/friends` require authentication.

-   **`GET /friends`**
    -   Gets all friends and pending friend requests for the user.
    -   **Responses:**
        -   `200 OK`: An object containing arrays of friends and pending requests.
        -   **Example:**
            ```json
            {
                "friends": [
                    {
                        "id": "friendshipId1",
                        "sender": {
                            "id": "anotherUserId",
                            "username": "frienduser"
                        }
                    }
                ],
                "pending": [
                    {
                        "id": "friendRequestId1",
                        "sender": {
                            "id": "pendingUserId",
                            "username": "pendinguser"
                        }
                    }
                ]
            }
            ```
-   **`POST /friends`**
    -   Sends a friend request to another user.
    -   **Body:**
        -   `recipientId` (string, required): The ID of the user to send the request to.
    -   **Responses:**
        -   `201 Created`: `{ "id": string }` (The ID of the new friend request).
        -   **Example:**
            ```json
            {
                "id": "newFriendRequestId"
            }
            ```
        -   `400 Bad Request`: If the recipient ID is invalid or the user doesn't exist.
        -   `409 Conflict`: If a friend request already exists or they are already friends.
-   **`POST /friends/:requestId/accept`**
    -   Accepts a friend request.
    -   **Parameters:**
        -   `requestId` (URL parameter): The ID of the friend request.
    -   **Responses:**
        -   `200 OK`
        -   `403 Forbidden`: If the sender tries to accept the request.
        -   `404 Not Found`: If the request does not exist.
        -   `409 Conflict`: If they are already friends.
-   **`DELETE /friends/:requestId`**
    -   Rejects a friend request or deletes a friend.
    -   **Parameters:**
        -   `requestId` (URL parameter): The ID of the friend request/friendship.
    -   **Responses:**
        -   `200 OK`
        -   `403 Forbidden`: If the sender tries to reject the request.
        -   `404 Not Found`: If the request does not exist.

### Conversations

All endpoints under `/conversations` require authentication.

-   **`GET /conversations`**
    -   Gets a list of all conversations the user is a part of.
    -   **Responses:**
        -   `200 OK`: An array of conversation objects.
        -   **Example:**
            ```json
            [
                {
                    "id": "conversationId1",
                    "type": "DIRECT_MESSAGE",
                    "title": null,
                    "createdAt": "2023-10-27T10:00:00Z",
                    "updatedAt": "2023-10-27T10:05:00Z"
                },
                {
                    "id": "conversationId2",
                    "type": "GROUP",
                    "title": "My Group",
                    "createdAt": "2023-10-28T11:00:00Z",
                    "updatedAt": "2023-10-28T11:00:00Z"
                }
            ]
            ```
-   **`GET /conversations/:conversationId`**
    -   Gets a specific conversation.
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
    -   **Responses:**
        -   `200 OK`: The conversation object.
        -   **Example:**
            ```json
            {
                "id": "conversationId1",
                "type": "DIRECT_MESSAGE",
                "title": null,
                "createdAt": "2023-10-27T10:00:00Z",
                "updatedAt": "2023-10-27T10:05:00Z"
            }
            ```
-   **`POST /conversations`**
    -   Creates a new conversation.
    -   **Body:**
        -   `type` (string, required): "DIRECT_MESSAGE" or "GROUP".
        -   `members` (array of strings, required): An array of user IDs to include in the conversation.
        -   `title` (string, optional): The title of the conversation (for groups).
    -   **Responses:**
        -   `201 Created`: `{ "id": string }` (The ID of the new conversation).
        -   **Example:**
            ```json
            {
                "id": "newConversationId"
            }
            ```
        -   `400 Bad Request`: For invalid input.
        -   `409 Conflict`: If a DM already exists between the users.
-   **`PATCH /conversations/:conversationId`**
    -   Updates the title of a conversation.
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
    -   **Body:**
        -   `title` (string, required)
    -   **Responses:**
        -   `200 OK`
        -   `400 Bad Request`: For invalid patch fields.
        -   `403 Forbidden`: If the user is not part of the conversation.
        -   `404 Not Found`: If the conversation does not exist.

#### Conversation Members

-   **`GET /conversations/:conversationId/members`**
    -   Gets the members of a specific conversation.
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
    -   **Responses:**
        -   `200 OK`: An array of member objects.
        -   **Example:**
            ```json
            [
                {
                    "userId": "clsdjflkjsdflkjsdflkjsdf",
                    "joinTime": "2023-10-27T10:00:00Z"
                },
                {
                    "userId": "anotherUserId",
                    "joinTime": "2023-10-27T10:00:00Z"
                }
            ]
            ```
-   **`POST /conversations/:conversationId/members`**
    -   Adds a new member to a conversation.
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
    -   **Body:**
        -   `id` (string, required): The user ID of the member to add.
    -   **Responses:**
        -   `201 Created`: `{ "id": string }` (The ID of the new member entry).
        -   **Example:**
            ```json
            {
                "id": "newMemberEntryId"
            }
            ```
        -   `400 Bad Request`: For invalid user ID or if the user is already a member.
-   **`DELETE /conversations/:conversationId/members/:memberId`**
    -   Removes a member from a conversation (the user leaves).
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
        -   `memberId` (URL parameter): The user ID of the member to remove.
    -   **Responses:**
        -   `200 OK`
        -   `404 Not Found`: If the member does not exist in the conversation.

#### Conversation Messages

-   **`GET /conversations/:conversationId/messages`**
    -   Gets messages from a conversation, with pagination.
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
    -   **Query Parameters:**
        -   `limit` (number, optional, default 10, max 10): The number of messages to retrieve.
        -   `before` (string, optional): A message ID to fetch messages before.
        -   `after` (string, optional): A message ID to fetch messages after.
    -   **Responses:**
        -   `200 OK`: An object containing `messages` array and `pagination` info.
        -   **Example:**
            ```json
            {
                "messages": [
                    {
                        "id": "messageId1",
                        "conversationId": "conversationId1",
                        "authorId": "clsdjflkjsdflkjsdflkjsdf",
                        "content": "Hello there!",
                        "timestamp": "2023-10-27T10:00:00Z"
                    }
                ],
                "pagination": {
                    "hasNext": true,
                    "cursor": "messageId2"
                }
            }
            ```
-   **`GET /conversations/:conversationId/messages/:messageId`**
    -   Gets a specific message.
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
        -   `messageId` (URL parameter): The ID of the message.
    -   **Responses:**
        -   `200 OK`: The message object.
        -   **Example:**
            ```json
            {
                "id": "messageId1",
                "conversationId": "conversationId1",
                "authorId": "clsdjflkjsdflkjsdflkjsdf",
                "content": "Hello there!",
                "timestamp": "2023-10-27T10:00:00Z"
            }
            ```
        -   `404 Not Found`: If the message does not exist.
-   **`POST /conversations/:conversationId/messages`**
    -   Sends a message to a conversation.
    -   **Parameters:**
        -   `conversationId` (URL parameter): The ID of the conversation.
    -   **Body:**
        -   `content` (string, required): The content of the message.
    -   **Responses:**
        -   `201 Created`: `{ "id": string, "timestamp": date }` (The ID and timestamp of the new message).
        -   **Example:**
            ```json
            {
                "id": "newMessageId",
                "timestamp": "2023-10-27T10:05:00Z"
            }
            ```
        -   `400 Bad Request`: If the message content is missing.
