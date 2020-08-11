# 2020-Summer-Puppeteer
Summer internship project uses Google Puppeteer to generate PDFs from html strings and scrape website data


REQUIRES:
- Docker (runs the server inside a docker container)
- Postman (for API requests)
<br />
TO RUN:
- navigate to docker directory <br />
cd /<directory>
    <br />
- build Docker image <br />
docker build -t <yourname>/node-web-app .
    <br />
- start up server on localhost <br />
docker run -v <local computer directory>:<inner docker directory>/ -p 49160:8080 <yourname>/node-web-app nodemon <inner docker directory>/server.js
<br />

POSTMAN API REQUESTS:
- POST commands are used to send and receive data from the server
- url should be http://localhost:49160/<function here>
- body should be in raw json format
- scrapers take the following format:
    {
      "id": "<some license number>"
    }
- pdf generator uses the following format:
    {
      "css": "<css filepath>",
      "header": "<header filepath>",
      "footer": "<footer filepath>",
      "body": "<html string filepath>"
    }
