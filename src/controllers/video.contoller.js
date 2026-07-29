import mongoose , {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {User} from "../models/user.models.js"
import {ApiResponse} from "../utils/ApiResponse.js"

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


    const videos = Video.aggregate([
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
