import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,      
    api_secret: process.env.CLOUDINARY_SECRET     
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
     //  console.log("File uploaded to Cloudinary:", result.url);
        fs.unlinkSync(localFilePath);   // clean up the local temp file
        return result;
    } catch (error) {
        fs.unlinkSync(localFilePath);   // remove local temp file on failure
        console.error("Cloudinary upload error:", error);
        return null;
    }
}

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try{
        if(!publicId){
            return null
        }

        const response = await cloudinary.uploader.destroy(publicId, {resource_type : resourceType})
        return response

    } catch (error) {
        console.error("Cloudinary delete error:", error);
        return null;
    }
}

export { uploadOnCloudinary }