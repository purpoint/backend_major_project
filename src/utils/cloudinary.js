import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,      // no quotes!
    api_secret: process.env.CLOUDINARY_SECRET     // no quotes!
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("File uploaded to Cloudinary:", result.url);
        fs.unlinkSync(localFilePath);   // clean up the local temp file
        return result;
    } catch (error) {
        fs.unlinkSync(localFilePath);   // remove local temp file on failure
        console.error("Cloudinary upload error:", error);
        return null;
    }
}

export { uploadOnCloudinary }