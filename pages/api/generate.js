import OpenAI from "openai";

const openai = new OpenAI();

const systemPrompt =
  "You are a data analysis assistant. Help users understand datasets and analysis questions. Do not invent statistics or observations that are not supported by the supplied data. When a description does not contain enough information to calculate statistics or chart points, explain that in the summary and return empty statistics and chart data. Prefer concise, useful insights.";

let chatHistory = [{ role: "system", content: systemPrompt }];

async function analyzeData(input) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${systemPrompt} Return a JSON object with this exact structure: {"summary":"string","statistics":[{"name":"string","value":"string","unit":"string"}],"insights":["string"],"chart":{"type":"bar|line|pie","data":[{"label":"string","value":0}]}}. Use numeric values for chart data and include only values supported by the input.`,
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("The model returned an empty analysis.");
  }

  const result = JSON.parse(content);
  const chartTypes = ["bar", "line", "pie"];

  return {
    summary: typeof result.summary === "string" ? result.summary : "",
    statistics: Array.isArray(result.statistics)
      ? result.statistics
          .filter((item) => item && typeof item.name === "string")
          .map((item) => ({
            name: item.name,
            value: String(item.value ?? ""),
            unit: typeof item.unit === "string" ? item.unit : "",
          }))
      : [],
    insights: Array.isArray(result.insights)
      ? result.insights.filter((item) => typeof item === "string")
      : [],
    chart: {
      type: chartTypes.includes(result.chart?.type) ? result.chart.type : "bar",
      data: Array.isArray(result.chart?.data)
        ? result.chart.data
            .filter(
              (point) =>
                point &&
                point.label !== undefined &&
                Number.isFinite(Number(point.value))
            )
            .map((point) => ({
              label: String(point.label),
              value: Number(point.value),
            }))
        : [],
    },
  };
}

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case "POST":
      if (req.query.endpoint === "chat") {
        // Handle POST to /api/generate?endpoint=chat
        const content = req.body.message;
        chatHistory.push({ role: "user", content: content });
        res.status(200).json({ success: true });
      } else if (req.query.endpoint === "reset") {
        // Handle POST to /api/generate?endpoint=reset
        chatHistory = [{ role: "system", content: systemPrompt }];
        res.status(200).json({ success: true });
      } else if (req.query.endpoint === "analyze") {
        const { dataset, description } = req.body || {};
        const hasDataset = dataset !== undefined && dataset !== null;
        const hasDescription =
          typeof description === "string" && description.trim().length > 0;

        if (!hasDataset && !hasDescription) {
          res.status(400).json({
            error: "Provide a dataset or a non-empty description to analyze.",
          });
          break;
        }

        try {
          const input = hasDataset ? { dataset } : { description: description.trim() };
          const analysis = await analyzeData(input);
          res.status(200).json(analysis);
        } catch (error) {
          res.status(500).json({ error: "Unable to analyze the supplied data." });
        }
      } else {
        res.status(404).json({ error: "Not Found" });
      }
      break;
    case "GET":
      if (req.query.endpoint === "history") {
        res.status(200).json(chatHistory);
      } else if (req.query.endpoint === "stream") {
        // Set headers for Server-Sent Events
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
          const stream = await openai.beta.chat.completions.stream({
            model: "gpt-3.5-turbo",
            messages: chatHistory,
            stream: true,
          });

          for await (const chunk of stream) {
            const message = chunk.choices[0]?.delta?.content || "";
            res.write(`data: ${JSON.stringify(message)}\n\n`);
          }

          // After the stream ends, get the final chat completion
          const chatCompletion = await stream.finalChatCompletion();
        } catch (error) {
          res.write(
            "event: error\ndata: " +
              JSON.stringify({ message: "Stream encountered an error" }) +
              "\n\n"
          );
        }

        // When the client closes the connection, we stop the stream
        return new Promise((resolve) => {
          req.on("close", () => {
            resolve();
          });
        });
      } else {
        res.status(404).json({ error: "Not Found" });
      }
      break;
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
