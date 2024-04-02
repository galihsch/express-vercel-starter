import { join } from "path";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jsend from "jsend";
import axios from "axios";

import logger from "../logger";
import errorHandler from "../middlewares/error-handler";
import todoRoutes from "./routes/todo";

const app = express();
const isVercel = process.env.DEPLOYMENT_ENV === "vercel";

// middleware routes
const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  app.use(helmet());
}
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(jsend.middleware); // more detail on https://github.com/omniti-labs/jsend
app.use(errorHandler);
const options = {
  dotfiles: "ignore",
  etag: false,
  extensions: ["htm", "html"],
  index: false,
  maxAge: "1d",
  redirect: false,
  setHeaders(res: express.Response) {
    res.set("x-static-timestamp", Date.now().toString());
  },
};

app.use("/static", express.static(join(__dirname, "../public"), options));

app.get("/", (_req, res: express.Response) => {
  res.send("Open Swagger UI at http://localhost:3000/static/index.html");
});

app.get("/api", (_req, res: express.Response) => {
  res.setHeader("Content-Type", "application/json");
  res.json({ name: "Hello world" });
});

app.get("/proxy", async (req, res) => {
  try {
    const fileUrl = req.query.fileUrl;
    const fileName = req.query.fileName;

    if (!fileUrl || !fileName) {
      return res.status(400).send("Invalid parameters.");
    }

    const response = await axios.get(fileUrl, { responseType: "stream" });

    if (!response.ok) {
      return res
        .status(response.status)
        .send(`Error downloading file: ${response.statusText}`);
    }

    res.setHeader("Content-Type", response.headers["content-type"]);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    response.data.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error downloading file.");
  }
});

app.use("/api/todo", todoRoutes);

if (!isVercel) {
  app.listen(3000).on("listening", () => {
    logger.info("server is listening on port http://localhost:3000");
  });
}

module.exports = app;
