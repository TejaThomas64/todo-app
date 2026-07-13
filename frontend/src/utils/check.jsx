import express from "express";

const app= express();

const req= require("./data.json");

app.get("/", (req, res) => {
    res.json(req);
});

app.listen(3000, () => {
    console.log("Server started on port 3000");
});

