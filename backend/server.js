require("dotenv").config();



const cron = require("node-cron")

const { createClient } = require("@supabase/supabase-js");

const adminSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function createUserSupabase(req) {
    return createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: req.headers.authorization,
                },
            },
        }
    );
}

const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});



const express = require("express");
const cors = require("cors");


const supabase = require("./db/db");


const app = express();

app.use(cors());
app.use(express.json());

function getTokenFromHeader(req) {
    const authHeader = req.headers.authorization || "";
    return authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
}

// function createAuthClient(token) {
//     return createClient(supabaseUrl, token || "");
// }

async function getUserFromRequest(req) {
    const token = getTokenFromHeader(req);
    if (!token) {
        return {
            user: null,
            error: new Error("Missing authorization token")
        };
    }
    const { data, error } = await supabase.auth.getUser(token);

    console.log("User:", data?.user);
    console.log("Error:", error);

    return {
        user: data?.user ?? null,
        error
    };


}

app.get("/test-email", async (req, res) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "Test Email",
            text: "Hello from my Todo App",
        });

        res.send("Email sent successfully");
    } catch (error) {
        console.error(error);
        res.status(500).send("Failed to send email");
    }
});

app.get("/", (req, res) => {
    res.send("backend running");
});

app.get("/tasks/:userId", async (req, res) => {

    const userSupabase = createUserSupabase(req);

    const userId = req.params.userId;
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { data, error } = await userSupabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId);
    if (error) {
        return res.status(500).json(error);
    }
    res.json(data);
});

app.get("/dbtest", async (req, res) => {
    const userSupabase = createUserSupabase(req);
    const { data, error } = await userSupabase
        .from("tasks")
        .select("*");
    if (error) {
        return res.status(500).json(error);
    }
    res.json(data);

});


app.post("/tasks", async (req, res) => {
    console.time("create task");
    const userSupabase = createUserSupabase(req);
    const { text, status, due_date, user_id } = req.body;

    console.log("Request body:", req.body);



    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.id !== user_id) {
        console.log("User mismatch");
        console.log("JWT user:", user.id);
        console.log("Body user:", user_id);
        return res.status(403).json({ error: "Forbidden" });
    }

    const { data, error } = await userSupabase
        .from("tasks")
        .insert([{ text, status, due_date, user_id }])
        .select();

    console.timeEnd("create task");
    console.log("Insert data:", data);
    console.log("Insert error:", error);

    if (error) {
        return res.status(500).json(error);
    }

    console.log("About to send email");
    console.log("Recipient:", user.email);

    console.time("email");
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Task Created",
            text: `
Hello,

Your task "${text}" has been created successfully.

Status: ${status}
Due Date: ${due_date}

Thank you for using Todo App.
`,
        });

        console.timeEnd("email");
        console.log("Email sent ")
    } catch (mailError) {
        console.error("Email failed:", mailError);
    }

    res.json(data);
});

app.put("/tasks/:id", async (req, res) => {
    const userSupabase = createUserSupabase(req);
    const { id } = req.params;
    const { text, status, due_date } = req.body;
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: task, error: taskError } = await userSupabase
        .from("tasks")
        .select("user_id")
        .eq("id", id)
        .single();

    if (taskError) {
        return res.status(500).json(taskError);
    }

    if (!task || task.user_id !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const updates = {};
    if (text !== undefined) updates.text = text;
    if (status !== undefined) updates.status = status;
    if (due_date !== undefined) updates.due_date = due_date;

    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid update fields provided." });
    }

    const { data, error } = await userSupabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select();

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data[0] || null);
});

app.delete("/tasks/:id", async (req, res) => {
    const userSupabase = createUserSupabase(req);
    const { id } = req.params;
    const { user, error: authError } = await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { data: task, error: taskError } = await userSupabase
        .from("tasks")
        .select("user_id")
        .eq("id", id)
        .single();

    if (taskError) {
        return res.status(500).json(taskError);
    }

    if (!task || task.user_id !== user.id) {
        return res.status(403).json({ error: "Forbidden" });
    }

    const { error } = await userSupabase
        .from("tasks")
        .delete()
        .eq("id", id);

    if (error) {
        return res.status(500).json(error);
    }

    res.json({
        message: "Task deleted"
    });
});

app.get("/subtasks/:taskId", async (req, res) => {

    const userSupabase = createUserSupabase(req);

    const { taskId } = req.params;

    const { user, error: authError } =
        await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const { data: task, error: taskError } =
        await userSupabase
            .from("tasks")
            .select("user_id")
            .eq("id", taskId)
            .single();

    if (taskError) {
        return res.status(500).json(taskError);
    }

    if (!task || task.user_id !== user.id) {
        return res.status(403).json({
            error: "Forbidden"
        });
    }

    const { data, error } =
        await userSupabase
            .from("subtasks")
            .select("*")
            .eq("task_id", taskId);

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});



app.post("/subtasks", async (req, res) => {

    const userSupabase = createUserSupabase(req);

    const { task_id, text } = req.body;

    const { user, error: authError } =
        await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const { data: task, error: taskError } =
        await userSupabase
            .from("tasks")
            .select("user_id")
            .eq("id", task_id)
            .single();

    if (taskError) {
        return res.status(500).json(taskError);
    }

    if (!task || task.user_id !== user.id) {
        return res.status(403).json({
            error: "Forbidden"
        });
    }

    const { data, error } =
        await userSupabase
            .from("subtasks")
            .insert([
                {
                    task_id,
                    text
                }
            ])
            .select();

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

app.put("/subtasks/:id", async (req, res) => {

    const userSupabase = createUserSupabase(req);

    const { id } = req.params;
    const { completed } = req.body;

    const { user, error: authError } =
        await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const { data: subtask, error: subtaskError } =
        await userSupabase
            .from("subtasks")
            .select(`
                *,
                tasks(user_id)
            `)
            .eq("id", id)
            .single();

    if (subtaskError) {
        return res.status(500).json(subtaskError);
    }

    if (
        !subtask ||
        subtask.tasks.user_id !== user.id
    ) {
        return res.status(403).json({
            error: "Forbidden"
        });
    }

    const { data, error } =
        await userSupabase
            .from("subtasks")
            .update({ completed })
            .eq("id", id)
            .select();

    if (error) {
        return res.status(500).json(error);
    }

    res.json(data);
});

app.delete("/subtasks/:id", async (req, res) => {

    const userSupabase = createUserSupabase(req);

    const { id } = req.params;

    const { user, error: authError } =
        await getUserFromRequest(req);

    if (authError || !user) {
        return res.status(401).json({
            error: "Unauthorized"
        });
    }

    const { data: subtask, error: subtaskError } =
        await userSupabase
            .from("subtasks")
            .select(`
                *,
                tasks(user_id)
            `)
            .eq("id", id)
            .single();

    if (subtaskError) {
        return res.status(500).json(subtaskError);
    }

    if (
        !subtask ||
        subtask.tasks.user_id !== user.id
    ) {
        return res.status(403).json({
            error: "Forbidden"
        });
    }

    const { error } =
        await userSupabase
            .from("subtasks")
            .delete()
            .eq("id", id);

    if (error) {
        return res.status(500).json(error);
    }

    res.json({
        message: "Subtask deleted"
    });
});



cron.schedule("0 9 * * *", async () => {
    try {
        console.log("Checkinh remainders")

        const tommorow = new Date();
        tommorow.setDate(tommorow.getDate() + 1);
        const dueDate = tommorow.toISOString().split("T")[0]
        const { data: tasks, error } = await adminSupabase
            .from("tasks")
            .select("*")
            .eq("due_date", dueDate)
            .neq("status", "completed");
        if (error) {
            console.error(error);
            return;
        }

        for (const task of tasks) {

            const { data: userData, error: userError } =
                await adminSupabase.auth.admin.getUserById(
                    task.user_id
                );

            if (userError) {
                console.error(userError);
                continue;
            }

            const email = userData.user.email;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Task Reminder",
                text: `Your task "${task.text}" is due tomorrow.`,
            });

            console.log(
                `Reminder sent to ${email}`
            );
        }
    } catch (error) {
        console.error(error);
    }
});

// app.listen(3000, () => {
//     console.log("backend running on port 3000");
// });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`backend running on port ${PORT}`);
});