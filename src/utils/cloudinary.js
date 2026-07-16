import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


(async function() {

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: 'process.env.CLOUDINARY_API_KEY', 
        api_secret: 'process.env.CLOUDINARY_SECRET'
    });


    const uploadOnCloudinary = async (localFilePath)=> {
        try{
            if(!localFilePath) {
                //upload the file to cloudinary
                throw new Error("File path is required for upload.");
            }
            const result = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto",
            });
            //file has been uploaded to cloudinary
            console.log("File uploaded to Cloudinary successfully.", result.url);
            return result;
        }
        catch(error){
            fs.unlinkSync(localFilePath) // remove the file from local storage if upload fails
            console.error("Error uploading file to Cloudinary:", error);
            throw error;
        }
    }

})

export {uploadOnCloudinary}
