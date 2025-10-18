export type User = {
  username: string;
  password: string;
};

let users: User[] = [];

export function getUsers() {
  return users;
}

export function getUser(username: string) {
  return users.find((user) => user.username === username);
}

export function checkUserExists(username: string) {
  return getUser(username) !== undefined;
}

export function registerUser(user: User) {
  users.push(user);
}
