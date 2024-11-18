const dotenv = require("dotenv");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const fs = require("fs");
API_KEY = "AIzaSyAx7YNEjSQ7U6Os2ww8H3SkMKwCVl15yTI";
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios");
const PORT = 5000;
const genAI = new GoogleGenerativeAI(API_KEY);

dotenv.config();

// Middleware
const app = express();
const cors = require("cors");
app.use(
  cors({
    origin: "http://127.0.0.1:5501",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// -----------------------------Cấu hình multer để lưu trữ ảnh

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Tạo thư mục dựa trên tham số từ client
    let STT = "";
    if (req.body.type == "Assignment") {
      STT = req.body.STT;
    }
    const folderName = req.body.id + "/" + req.body.type + "/" + STT;
    const uploadPath = "./uploads/" + folderName;
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Tùy chỉnh tên file
    let STT = "";
    if (req.body.type == "Assignment") {
      STT = req.body.STT;
    }
    const folderName = req.body.id + "/" + req.body.type + "/" + STT;
    const uploadPath = `./uploads/${folderName}`;
    const customName = req.body.type; // Lấy customName từ body
    const fileExtension = path.extname(file.originalname); // Phần mở rộng của file
    let i = 1;
    while (
      fs.existsSync(
        uploadPath + "/" + customName + i.toString() + fileExtension
      )
    )
      i++;
    cb(null, `${customName}${i}${fileExtension}`); // Tên file tùy chỉnh
  },
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//// -----------------------------------------API Upload Ass
app.post("/upload/Ass", upload.array("image"), (req, res) => {
  if (!req.files) {
    return res.status(400).json({ error: "No file uploaded!" });
  }
  res.status(200).json({
    message: "File uploaded successfully!",
    file: req.files,
  });

  // res.status(200).json({ message: 'File uploaded successfully', file: req.files.filename });
});

// ---------------------------------------------Mark

function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

app.post("/upload/Mark", async (req, res) => {
  try {
    //model
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: "Name of Student",
        },
        score: {
          type: SchemaType.NUMBER,
          description: "Overall score of Student",
        },
        comment: {
          type: SchemaType.STRING,
          description: "Lỗi sai của học sinh so với bài làm đúng",
        },
      },
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      // generationConfig: {
      //   responseMimeType: 'application/json',
      //   responseSchema: schema,
      // }
    });
    //getdata
    const prompt =
      "đưa ra bài làm của học sinh dựa trên hình ảnh, câu 1 là đặt tính và tính";

    const file1 = fileToGenerativePart("./uploads/1.jpg", "image/jpeg");
    const file2 = fileToGenerativePart("./uploads/2.jpg", "image/jpeg");
    const file3 = fileToGenerativePart("./uploads/3.jpg", "image/jpeg");

    const imageParts = [file1, file2, file3];
    // prompt
    const result = await model.generateContent([prompt, imageParts]);
    const response = await result.response;
    res.status(200).json({ text: response.text() });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

// -------------------------------------------------Renew folder
app.post("/upload/renewFolder", (req, res) => {
  const name = req.body.id; // unique name
  const folderPath = "./uploads/" + name;

  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file, index) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Xóa thư mục con
        deleteFolderRecursive(curPath);
      } else {
        // Xóa file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(folderPath);
    console.log(`${folderPath} is deleted!`);
  } else {
    console.log(`Directory ${folderPath} does not exist!`);
  }

  fs.mkdir(folderPath, { recursive: true }, (err) => {
    if (err) {
      return console.error("Error:", err);
    }
    console.log("Thư mục đã được tạo thành công!");
  });
});

// -------------------------------------------------Create folder
app.post("/upload/newFolder", (req, res) => {
  const name = req.body.id; // unique name
  const folderName = "./uploads/" + name;

  if (fs.existsSync(folderName)) {
    console.log("Thư mục tồn tại.");
  } else {
    fs.mkdir(folderName, { recursive: true }, (err) => {
      if (err) {
        return console.error("Error:", err);
      }
      console.log("Thư mục đã được tạo thành công!");
    });
  }
});

// ----------------------------------------------Bắt đầu server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
