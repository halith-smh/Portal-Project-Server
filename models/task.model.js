const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Add suitable title to the task"],
    },
    description: {
        type: String,
        required: [true, "Add suitable Description to the task"]
    },
    status: {
        type: String,
        enum: ["To do", "In Progress", "Completed"],
        default: "To do"
    },
    priority: {
        type: String,
        enum: ["High", "Medium", "Low"],
        default: "Low"
    },
    dueDate: {
        type: String,
        required: [true, "Enter Due Date for the task"]
    }
}, {timestamps: true})

const Task = mongoose.model("tasks", taskSchema);

module.exports = Task;