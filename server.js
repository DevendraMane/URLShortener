import { readFile, writeFile } from "fs/promises";
import http from "http";
import crypto from "crypto";
import path from "path";

const PORT = process.env.PORT || 1234; // Use dynamic PORT for Render or default to 1234
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

  if (req.method === "GET") {
    if (req.url === "/") {
      serveFiles(res, "index.html", "text/html");
    } else if (req.url === "/style.css") {
      serveFiles(res, "style.css", "text/css");
    } else if (req.url === "/links") {
      const links = await loadLinks();
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(links));
    } else {
      const shorCode = req.url.slice(1);
      if (links[shorCode]) {
        res.writeHead(302, { location: links[shorCode] });
        return res.end();
      }
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Shortened URL not found");
    }
  }

  if (req.method === "POST" && req.url === "/shortCode") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const { url, shortCode } = JSON.parse(body);

        if (!url) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("URL is required");
          return;
        }

        const finalShortCode =
          shortCode || crypto.randomBytes(4).toString("hex");

        if (links[finalShortCode]) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("ShortCode already exists, use another one");
          return;
        }

        links[finalShortCode] = url;
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

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server Running on port ${PORT}`);
});
