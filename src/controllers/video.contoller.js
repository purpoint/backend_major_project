import mongoose , {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {User} from "../models/user.models.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async(req , res)=> {
    const { page=1, limit=10, query, sortBy, sortType, userId} = req.query

    const matchStage = {
        isPublished: true
    }

    if(userId) {
        if(!isValidObjectId(userId)){
            throw new ApiError(400, "Invalid User Id")
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    const allowedSortFields = ["createdAt", "views", "duration", "title"]
    const sortField = allowedSortFields.includes(sortBy) ? sortBy: "createdAt"
    const sortOrder = sortType === "asc" ? 1 : -1

    const sortStage = {}
    sortStage[sortField] = sortOrder

    const options = {
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: Math.min(50, Math.max(1, parseInt(limit, 10) || 10))
    }


    const videoAggregate = Video.aggregate([
        {$match: matchStage},
        {$sort: sortStage},
        {
            $lookup: {
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as: "owner",
                pipeline:[
                    {
                        $project:{
                            username : 1,
                            fullname: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {$first: "$owner"}
            }
        }
    ])

    const videos = await Video.aggregatePaginate(videoAggregate, options)

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))

})

const publishAVideo = asyncHandler(async(req,res)=> {
    const {title, description} = req.body

    if(!title?.trim() || !description?.trim()) {
        throw new ApiError(400, "Title and description are mandatory..")
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if(!videoFileLocalPath){
        throw new ApiError(400, "Video file is required!!")
    }

    if(!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required!!")
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath)

    if(!videoFile) {
        throw new ApiError(500, "Failed to upload Video file on Cloudinary")
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!thumbnail) {
        await deleteFromCloudinary(videoFile.public_id, "video")
        throw new ApiError(500, "Failed to upload Thumnail file on Coudinary")
    }

    const video = await Video.create({
        title: title.trim(),
        description: description.trim(),
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration,
        owner: req.user._id,
        isPublished: true
    })

    if (!video) {
        await deleteFromCloudinary(videoFile.public_id, "video")
        await deleteFromCloudinary(thumbnail.public_id, "image")
        throw new ApiError(500, "Something went wrong while saving the video")
    }

    return res
    .status(201)
    .json(new ApiResponse(201, video, "Video Published Successfully!!"
    ))

})

const getVideoById = asyncHandler(async(req, res)=> {
    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId).populate(
        "owner",
        "username fullname avatar"
    )

    if(!video) {
        throw new ApiError(400, "Video not Found!")
    }

    const isOwner = video.owner._id.toString() === req.user._id.toString()

    if(!video.isPublished && !isOwner) {
        throw new ApiError(403, "This video is not available")
    }

    await Video.findByIdAndUpdate(videoId, { $inc: { views : 1}})
    video.views+=1

    await User.findByIdAndUpdate(req.user._id,{
        $addToSet: {watchHistory : video._id}
    })

    return res
    .status(201)
    .json(new  ApiResponse(200, video, "Video fetched Successfully!"))
})

const updateVideo = asyncHandler(async(req,res)=> {
    const {videoId} = req.params
    const {title,description} = req.body
    const thumbnailLocalPath = req.file?.path

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    if (!title?.trim() && !description?.trim() && !thumbnailLocalPath) {
        throw new ApiError(400, "At least one field is required to update")
    }
    const video = Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video not Found!")
    }
    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You cannot edit someone else's video!")
    }
    const updateFields = {}

    if(title?.trim()) updateFields.title = title.trim()
    if(description?.trim()) updateFields.description = description.trim()

    let newThumbnail
    if(thumbnailLocalPath) {
        newThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if(!newThumbnail){
            throw new ApiError(500, "Failed to upload new Thumbnail on Cloudinary!")
        }

        updateFields.thumbnail = newThumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateFields },
        { new: true }
    )

    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,

}
