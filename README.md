# Installing
```sh
git clone https://github.com/SingularityT3/MiniCordServer
cd MiniCordServer
npm i
echo "JWT_SECRET=test_secret
DATABASE_URL=\"mongodb://localhost:27017/minicord\"
CORS_ORIGIN=\"http://localhost:5173\"" > .env
npm run dev
```
