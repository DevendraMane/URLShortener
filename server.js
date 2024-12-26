import { readFile, writeFile } from "fs/promises";
import http from "http";
import crypto from "crypto";
import path from "path";
const PORT = 1234;

//? const result1 = path.join('folder', 'subfolder', 'file.txt');
const DATA_FILE = path.join("data", "links.json");

// for serving html, css files to the server
const serveFiles = async (res, file, contentType) => {
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { "Content-Type": contentType });
    res.end("404 Page not Found");
  }
};

// for loading the links to the server
const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // if the file doesn't exits then we are creating our own empty file
    // *ENOENT : error no entry
    if (error.code === "ENOENT") {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw error;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = http.createServer(async (req, res) => {
  const links = await loadLinks();

  // ?GET the html and css file on the "/" route
  if (req.method === "GET") {
    if (req.url === "/") {
      serveFiles(res, "index.html", "text/html");
    } else if (req.url === "/style.css") {
      serveFiles(res, "style.css", "text/css    ");
    }
    // ?How "/links" route is working
    else if (req.url === "/links") {
      // ?Taking all the links data from the data folder(representing backend)
      const links = await loadLinks();

      res.writeHead(200, { "Content-Type": "application/json" });

      // ?Returning links json data in string formate(i.e Object) to show on the html
      return res.end(JSON.stringify(links));
    }

    // For redirecting to the shorCode links:↓↓↓
    else {
      const links = await loadLinks();
      const shorCode = req.url.slice(1); //use slice here bcoz only req.url add "/" infront of the shortCode which is not present in the data folder(database)↓↓↓
      console.log("links redir:", req.url); //see the console if you are not understanding your own words

      if (links[shorCode]) {
        // ?Here this 302 status code means location found
        // and which location we are talking about (i.e: links[shorCode])
        // *Here the location: we redir to the value of the key if found(i.e: for 302)
        res.writeHead(302, { location: links[shorCode] });
        return res.end();
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("ShortendeURL not found");
    }
  }

  if (req.method === "POST" && req.url === "/shortCode") {
    const links = await loadLinks();
    // {url, shortCode} will get stored here(chunk by chunk)
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    // !Jab saara data aa jata hai then only this event triggers
    req.on("end", async () => {
      try {
        console.log("Request body received:", body);

        const { url, shortCode } = JSON.parse(body);

        //? if url is not present
        if (!url) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("URL is required");
          return;
        }

        const finalShortCode =
          shortCode || crypto.randomBytes(4).toString("hex");

        //* if you are thinking why links.finalShortCode is not used instead of links[finalShortCode] then it is bcoz its a string key(i.e "sad")
        if (links[finalShortCode]) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("ShortCode already exists, use another one");
          return;
        }

        links[finalShortCode] = url;

        // *this is how we are saving the links
        await saveLinks(links);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Submitted successfully" }));
      } catch (error) {
        console.error("Error processing request:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server Runnig on ${PORT}`);
});
