import Head from "next/head";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./index.module.css";

function formatPreviewValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

const sampleDatasets = [
  {
    label: "Sales Data",
    content: `month,online,in_store
January,12400,9800
February,13900,10200
March,15100,11700
April,14600,12600
May,17800,13900
June,19200,15100`,
  },
  {
    label: "Monthly Temperatures",
    content: `month,average_temperature_c
January,4
February,6
March,10
April,15
May,20
June,24
July,27
August,26
September,22
October,16
November,10
December,5`,
  },
  {
    label: "Customer Feedback Scores",
    content: `service,average_score_out_of_5
Delivery,4.2
Product quality,4.7
Support,3.9
Checkout,4.5
Returns,3.6`,
  },
];

export default function Home() {
  const [dataset, setDataset] = useState("");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [chartType, setChartType] = useState("bar");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setDataset(await file.text());
      setFileName(file.name);
      setAnalysis(null);
      setError("");
    } catch {
      setError("This file could not be read. Try pasting the data instead.");
    }
  };

  const analyzeDataset = async (event) => {
    event.preventDefault();
    if (!dataset.trim()) {
      setError("Add data or text before running the analysis.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/generate?endpoint=analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: dataset.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analysis failed.");
      setAnalysis(result);
      setChartType(result.chartType || "bar");
    } catch (requestError) {
      setError(requestError.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const chartPayload = analysis?.chartData || {};
  const chartData = Array.isArray(chartPayload.labels)
    ? chartPayload.labels.map((label, pointIndex) => {
        const point = { label };
        chartPayload.datasets?.forEach((dataset, datasetIndex) => {
          point[`series${datasetIndex}`] = dataset.data?.[pointIndex];
        });
        return point;
      })
    : [];
  const previewColumns = analysis?.cleanedData?.columns || [];
  const previewRecords = analysis?.cleanedData?.records || [];
  const seriesColors = ["#258c78", "#d36b4b", "#637aa8", "#c69a3c"];

  return (
    <div className={styles.appShell}>
      <Head>
        <title>Data Studio | Jean Stephane Yapo</title>
        <meta name="description" content="Explore your data with clear summaries, insights, and charts." />
      </Head>
      <header className={styles.topbar}>
        <a className={styles.brand} href="#top" aria-label="Data Studio home">
          <span className={styles.brandMark}>D</span> DATA STUDIO
        </a>
        <div className={styles.profile}><span className={styles.profileDot} />Jean Stephane Yapo</div>
      </header>

      <main className={styles.main} id="top">
        <section className={styles.intro}>
          <p className={styles.eyebrow}>YOUR DATA, IN FOCUS</p>
          <h1>Make sense of your numbers.</h1>
          <p className={styles.introText}>Drop in a dataset and get a clear read on what matters.</p>
        </section>

        <section className={styles.workspace} aria-label="Data analysis workspace">
          <form className={styles.inputPanel} onSubmit={analyzeDataset}>
            <div className={styles.panelHeading}>
              <div><p className={styles.sectionLabel}>01 / SOURCE</p><h2>Bring your data</h2></div>
              <span className={styles.fileTypes}>CSV · JSON · TXT</span>
            </div>
            <label className={styles.dropZone} htmlFor="dataset-file">
              <span className={styles.uploadIcon} aria-hidden="true">↑</span>
              <span className={styles.dropTitle}>Choose a file to upload</span>
              <span className={styles.dropHint}>or paste your data below</span>
              <input className={styles.fileInput} id="dataset-file" type="file" accept=".csv,.json,.txt,text/csv,application/json,text/plain" onChange={handleFile} />
            </label>
            {fileName && <p className={styles.fileName}><span className={styles.fileDot} />{fileName}</p>}
            <label className={styles.textareaLabel} htmlFor="dataset-text">Dataset content</label>
            <textarea
              className={styles.textarea}
              id="dataset-text"
              name="dataset"
              placeholder={'Paste CSV, JSON, or unstructured text...\n\nmonth,revenue\nJanuary,4200\nFebruary,5100'}
              value={dataset}
              onChange={(event) => { setDataset(event.target.value); setFileName(""); setAnalysis(null); }}
              spellCheck="false"
            />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.sampleSection}>
              <p className={styles.sampleLabel}>TRY A SAMPLE</p>
              <div className={styles.samplePresets}>
                {sampleDatasets.map((sample) => (
                  <button
                    className={styles.samplePreset}
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setDataset(sample.content);
                      setFileName("");
                      setAnalysis(null);
                      setError("");
                    }}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.formActions}>
              <button className={styles.analyzeButton} type="submit" disabled={isLoading || !dataset.trim()}>
                {isLoading ? "Analyzing..." : "Analyze data"}{!isLoading && <span aria-hidden="true">↗</span>}
              </button>
            </div>
            <p className={styles.privacyNote}>Your dataset is only used for this analysis.</p>
          </form>

          <section className={styles.results} aria-live="polite">
            {analysis ? (
              <>
                <div className={styles.resultsHeading}>
                  <div><p className={styles.sectionLabel}>02 / ANALYSIS</p><h2>Here&apos;s the picture</h2></div>
                  <span className={styles.readyBadge}><span /> ANALYSIS READY</span>
                </div>
                <div className={styles.chartSection}>
                  <div className={styles.chartHeading}>
                    <div><p className={styles.summaryLabel}>DATA BREAKDOWN</p><h3>At a glance</h3></div>
                    <div className={styles.chartToggle} aria-label="Chart type">
                      <button type="button" className={chartType === "bar" ? styles.activeToggle : ""} aria-pressed={chartType === "bar"} onClick={() => setChartType("bar")}>Bars</button>
                      <button type="button" className={chartType === "line" ? styles.activeToggle : ""} aria-pressed={chartType === "line"} onClick={() => setChartType("line")}>Line</button>
                      <button type="button" className={chartType === "pie" ? styles.activeToggle : ""} aria-pressed={chartType === "pie"} onClick={() => setChartType("pie")}>Pie</button>
                      <button type="button" className={chartType === "doughnut" ? styles.activeToggle : ""} aria-pressed={chartType === "doughnut"} onClick={() => setChartType("doughnut")}>Donut</button>
                    </div>
                  </div>
                  {chartData.length > 0 && chartPayload.datasets?.length > 0 ? (
                    <div className={styles.chart}>
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "pie" || chartType === "doughnut" ? (
                          <PieChart>
                            <Tooltip contentStyle={{ border: "1px solid #e2e4dc", borderRadius: 4 }} />
                            <Pie data={chartData} dataKey="series0" nameKey="label" innerRadius={chartType === "doughnut" ? "54%" : "0%"} outerRadius="78%" paddingAngle={2}>
                              {chartData.map((point, pointIndex) => <Cell key={`${point.label}-${pointIndex}`} fill={seriesColors[pointIndex % seriesColors.length]} />)}
                            </Pie>
                          </PieChart>
                        ) : chartType === "line" ? (
                          <LineChart data={chartData} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
                            <CartesianGrid stroke="#e8e9e3" vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <Tooltip contentStyle={{ border: "1px solid #e2e4dc", borderRadius: 4 }} />
                            {chartPayload.datasets.map((dataset, datasetIndex) => <Line key={dataset.label} type="monotone" dataKey={`series${datasetIndex}`} name={dataset.label} stroke={seriesColors[datasetIndex % seriesColors.length]} strokeWidth={3} dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />)}
                          </LineChart>
                        ) : (
                          <BarChart data={chartData} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
                            <CartesianGrid stroke="#e8e9e3" vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <Tooltip contentStyle={{ border: "1px solid #e2e4dc", borderRadius: 4 }} />
                            {chartPayload.datasets.map((dataset, datasetIndex) => <Bar key={dataset.label} dataKey={`series${datasetIndex}`} name={dataset.label} fill={seriesColors[datasetIndex % seriesColors.length]} radius={[3, 3, 0, 0]} maxBarSize={48} />)}
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : <div className={styles.chartEmpty}>No chartable data points were found in this analysis.</div>}
                </div>
                <section className={styles.insightBox} aria-label="AI Insight and Interpretation">
                  <p className={styles.insightTitle}>AI INSIGHT &amp; INTERPRETATION</p>
                  <p className={styles.insightText}>{analysis.analysis || "No interpretation was returned."}</p>
                </section>
                {previewColumns.length > 0 && previewRecords.length > 0 && (
                  <section className={styles.previewSection}>
                    <div className={styles.previewHeading}>
                      <p className={styles.insightTitle}>NORMALIZED DATA PREVIEW</p>
                      <span>{previewRecords.length} rows</span>
                    </div>
                    <div className={styles.tableWrap}>
                      <table className={styles.previewTable}>
                        <thead>
                          <tr>{previewColumns.map((column) => <th key={column.name}>{column.name}</th>)}</tr>
                        </thead>
                        <tbody>
                          {previewRecords.slice(0, 8).map((record, rowIndex) => (
                            <tr key={rowIndex}>
                              {previewColumns.map((column) => <td key={column.name}>{formatPreviewValue(record[column.name])}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewRecords.length > 8 && <p className={styles.previewNote}>Showing 8 of {previewRecords.length} normalized rows.</p>}
                  </section>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIllustration} aria-hidden="true"><span className={styles.emptyBarOne} /><span className={styles.emptyBarTwo} /><span className={styles.emptyBarThree} /><span className={styles.emptyLine} /></div>
                <p className={styles.sectionLabel}>YOUR CANVAS IS READY</p>
                <h2>Good data tells a story.</h2>
                <p>Upload a file or paste a dataset to see its summary, key signals, and chart.</p>
                <div className={styles.emptyFootnote}><span /> CSV / JSON / TXT supported</div>
              </div>
            )}
          </section>
        </section>
        <footer className={styles.footer}><span>DATA STUDIO</span><span>Made for curious minds</span><span>JEAN STEPHANE YAPO</span></footer>
      </main>
    </div>
  );
}
