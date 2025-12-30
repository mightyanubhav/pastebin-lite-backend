Pastebin-Lite

A simple Pastebin-like application that allows users to create text pastes and share a link to view them.
Each paste can optionally expire based on time-to-live (TTL) or maximum view count.

How to run Locally : 

Following are the procedure to run locally : 
1) Create a mongodb Atlas url like this < mongodb+srv://<user>:<password>@url...> for nodejs application and save it.
2) clone the repo ->
3) npm i ->
4) create .env file in root folder -> 
5) paste the following 

<!-- 
MONGO_URI=<MongoDB Atlas connection string>
BASE_URL=<Backend public URL>
TEST_MODE=0 

Also in pastes.js go to res.status of api uri /
change  url: `https://${baseUrl.replace(/^https?:\/\//, "")}/api/pastes/p/${paste._id}`,
to : `http://${baseUrl.replace(/^https?:\/\//, "")}/api/pastes/p/${paste._id}`
-->

5) Do npm run dev. backend will start to work 

[pastebin-lite-frontend](https://github.com/mightyanubhav/pastebin-lite-frontend)

6) Now go to the above url and clone this repo in another folder
7) make a .env file in root and paste 
    VITE_API_BASE_URL=http://localhost:3000
6) npm i 
7) then do npm run dev to run locally on port 5173

