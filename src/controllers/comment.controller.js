import mongoose, {isValidObjectId} from "mongoose"
import { Comment } from "../models/comments.models.js"
import { Like } from "../models/likes.models.js"
import { Video } from "../models/video.models.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async(req,res)=> {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video not Found!")
    }

    const options = {
        page: Math.max(1, parseInt(page,10) || 1),
        limit: Math.min(50, Math.max(1, parseInt(limit,10) || 10))
    }

    const commentAggregate = Comment.aggregate([
        {
            $match:{
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                    {$project: {username:1, fullname:1, avatar:1}}
                ]
            }
        },
        {
            $lookup: {
                from:"likes",
                localField:"_id",
                foreignField:"comment",
                as:"likes"
            }
        },
        {
            $addFields:{
                owner : {$first: "$owner"},
                likesCount: {$size: "$likes"},
                isLiked:{
                    $in:[req.user._id, "$likes.likedBy"]
                }
            }
        },
        {
            $project:{
                likes:0
            }
        }
    ])

    const comments = await Comment.aggregatePaginate(commentAggregate, options)

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"))

})

const addComment = asyncHandler(async(req,res)=> {
    const {videoId} = req.params
    const {content} = req.body

    if(!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id")
    }

    if(!content?.trim()) {
        throw new ApiError(400, "Comment content is required")
    }

    const video = await Video.findById(videoId) 

    if(!video){
        throw new ApiError(404, "Video not found!")
    }

    const comment = await Comment.create({
        content:content.trim(),
        video:videoId,
        owner:req.user._id
    })

    return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added Successfully!"))

})

const updateComment = asyncHandler(async(req,res)=>{
    const {commentId} = req.params
    const {content} = req.body

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid Comment Id")
    }

    if(!content?.trim()){
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.findById(commentId)

    if(!comment) {
        throw new ApiError(404,"Comment not Found!!")
    }

    if(comment.owner.toString()!== req.user._id.toString()){
        throw new ApiError(403, "You cannot edit someone else's comment")
    }

    const updateComment = await Comment.findByIdAndUpdate(
        commentId,
        {$set: {content: content.trim()}},
        {new: true}
    )

    return res
    .status(200)
    .json(new ApiResponse(200, updateComment, "Comment updated Successfully!"))
})

const deleteComment = asyncHandler(async(req,res)=> {
    const {commentId} = req.params

    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid Comment Id")
    }

    const comment = await Comment.findById(commentId)

    if(!comment) {
        throw new ApiError(404, "Comment not found!")
    }

    if(comment.owner.toString()!== req.user._id.toString()) {
        throw new ApiError(403, "You cannot delete someone else's comment")
    }

    await Comment.findByIdAndDelete(commentId)
    await Like.deleteMany({comment:commentId})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted Successfully!"))
})

export {
    getVideoComments,
    addComment,
    updateComment,

}