import { writeFileSync, existsSync, mkdirSync, PathLike } from "fs";
import { v4 as uuidv4 } from "uuid";
import { resolve } from "path";

require("dotenv").config();

const ALLOWED_FORMATS = ["image/png", "image/jpeg"];
const SAVE_PATH = resolve(__dirname, "../" + process.env.LOGO_FOLDER);

type FileFormat =
  | "image/png"
  | "image/gif"
  | "application/pdf"
  | "image/jpeg"
  | "application/zip";

/* TODO: ADD A CLEAN UP FUNCTION */

export const validateLogo = (buffer: Buffer) => {
  if (buffer.byteLength > 5000000) throw new Error("Maximum size is 5 MB.");

  const fileFormat = getMimeTypeFromArrayBuffer(buffer) || "";

  if (!ALLOWED_FORMATS.includes(fileFormat))
    throw new Error(`Allowed formats: ${ALLOWED_FORMATS.join(", ")}.`);

  return fileFormat;
};

export const saveLogo = (
  restaurantID: number,
  buffer: Buffer,
  format: FileFormat
) => {
  return new Promise<string>(async (resolve, reject) => {
    try {
      const restaurantLogoPath = `${SAVE_PATH}//${restaurantID}`;

      if (!existsSync(restaurantLogoPath))
        mkdirSync(restaurantLogoPath, { recursive: true });
      const name = uuidv4() + (format === "image/png" ? ".png" : ".jpg");

      await writeFileSync(`${restaurantLogoPath}//${name}`, buffer);

      resolve(`${process.env.BACKEND_URL}/cdn/${restaurantID}/${name}`);
    } catch (err) {
      if (err instanceof Error) console.log(err.message);
    }
  });
};

function getMimeTypeFromArrayBuffer(arrayBuffer: Buffer) {
  const uint8arr = new Uint8Array(arrayBuffer);

  const len = 4;
  if (uint8arr.length >= len) {
    let signatureArr = new Array(len);
    for (let i = 0; i < len; i++)
      signatureArr[i] = new Uint8Array(arrayBuffer)[i].toString(16);
    const signature = signatureArr.join("").toUpperCase();

    switch (signature) {
      case "89504E47":
        return "image/png";
      case "47494638":
        return "image/gif";
      case "25504446":
        return "application/pdf";
      case "FFD8FFDB":
      case "FFD8FFE0":
        return "image/jpeg";
      case "504B0304":
        return "application/zip";
      default:
        return null;
    }
  }
  return null;
}
