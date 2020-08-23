const keys = require("./keys");
const { indexAlreadyExists } = require("./utils");

// Express App Setup
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Postgres Client Setup
const { Pool } = require("pg");
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort,
});

const fib = (index) => {
  if (index < 2) return 1;
  return fib(index - 1) + fib(index - 2);
};

pgClient.on("connect", (client) => {
  client
    .query("CREATE TABLE IF NOT EXISTS fibdata (fibindices INT PRIMARY KEY)")
    .catch((err) => console.log(err));
});

// Redis client setup
const redis = require("redis");
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000,
});

const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get("/", (req, res) => {
  res.send("Hi");
});

app.get("/values/all", async (req, res) => {
  try {
    const values = await pgClient.query("SELECT * from fibdata");
    res.send(values.rows);
  } catch (err) {
    console.log("##get redis values err", err);
  }
});

app.get("/values/current", async (req, res) => {
  redisClient.hgetall("values", (err, values) => {
    res.send(values);
  });
});

app.post("/values", async (req, res) => {
  const index = req.body.index;

  if (parseInt(index, 10) > 40) {
    return res.status(422).send("Index too high");
  }
  const fibValue = fib(index);
  redisClient.hset("values", index, fibValue);
  // Redis pub/sub not working
  redisPublisher.publish("insert", index);
  try {
    const values = await pgClient.query("SELECT * from fibdata");
    if (!indexAlreadyExists(values.rows, parseInt(index, 10))) {
      await pgClient.query("INSERT INTO fibdata(fibindices) VALUES($1)", [
        parseInt(index, 10),
      ]);
    }
  } catch (err) {
    console.log("##pg insert err", err);
  }

  return res.send({ working: true });
});

app.listen(5000, (err) => {
  console.log("Listening");
});