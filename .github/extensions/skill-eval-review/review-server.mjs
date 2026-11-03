import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

import { saveFeedback } from "./review-model.mjs";

function jsonResponse(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

async function readRequestJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 1_000_000) {
      throw new Error("Request body exceeds 1 MB.");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function startReviewServer(state, reviewHtml) {
  const token = randomBytes(24).toString("hex");
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (url.searchParams.get("token") !== token) {
        jsonResponse(response, 403, { error: "Invalid canvas token." });
        return;
      }
      if (request.method === "GET" && url.pathname === "/") {
        response.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Length": Buffer.byteLength(reviewHtml),
          "Cache-Control": "no-store",
        });
        response.end(reviewHtml);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/state") {
        jsonResponse(response, 200, state);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/feedback") {
        const feedback = await saveFeedback(state, await readRequestJson(request));
        jsonResponse(response, 200, feedback);
        return;
      }
      jsonResponse(response, 404, { error: "Not found." });
    } catch (error) {
      jsonResponse(response, 400, { error: error.message });
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  return { server, url: `http://127.0.0.1:${address.port}/?token=${token}`, state };
}
