import mongoose ,{isValidObjectId} from "mongoose"
import { Like } from "../models/likes.models.js"
import { Video } from "../models/video.models.js"
import {Comment} from "../models/comments.models.js"
import {Tweet} from "../models/tweets.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async(req,res)=> {
    const {videoId} = req.params

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const existingLike = await Like.findOne({
        video:videoId,
        likedBy: req.user._id
    })

    if(existingLike) {
        await Like.findByIdAndDelete(existingLike._id)

        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked:false}, "Video Unliked"))
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked:true}, "Video Liked"))

})