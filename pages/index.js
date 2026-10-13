import Head from "next/head";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./index.module.css";

const sampleDataset = `month,revenue
January,4200
February,5100
March,4800
April,6700
May,7400
June,8100`;

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
      setError("Add a CSV or JSON dataset before running the analysis.");
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
      setChartType(result.chart?.type === "line" ? "line" : "bar");
    } catch (requestError) {
      setError(requestError.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = analysis?.chart?.data || [];

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
              <span className={styles.fileTypes}>CSV · JSON</span>
            </div>
            <label className={styles.dropZone} htmlFor="dataset-file">
              <span className={styles.uploadIcon} aria-hidden="true">↑</span>
              <span className={styles.dropTitle}>Choose a file to upload</span>
              <span className={styles.dropHint}>or paste your data below</span>
              <input className={styles.fileInput} id="dataset-file" type="file" accept=".csv,.json,text/csv,application/json" onChange={handleFile} />
            </label>
            {fileName && <p className={styles.fileName}><span className={styles.fileDot} />{fileName}</p>}
            <label className={styles.textareaLabel} htmlFor="dataset-text">Dataset content</label>
            <textarea
              className={styles.textarea}
              id="dataset-text"
              name="dataset"
              placeholder={'Paste CSV or JSON here...\n\nmonth,revenue\nJanuary,4200\nFebruary,5100'}
              value={dataset}
              onChange={(event) => { setDataset(event.target.value); setFileName(""); setAnalysis(null); }}
              spellCheck="false"
            />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.formActions}>
              <button className={styles.sampleButton} type="button" onClick={() => { setDataset(sampleDataset); setFileName(""); setAnalysis(null); setError(""); }}>Load sample</button>
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
                <div className={styles.summaryBlock}>
                  <span className={styles.summaryAccent} />
                  <div><p className={styles.summaryLabel}>THE OVERVIEW</p><p className={styles.summaryText}>{analysis.summary || "No summary was returned."}</p></div>
                </div>
                {analysis.statistics?.length > 0 && (
                  <div className={styles.statsGrid}>
                    {analysis.statistics.map((stat) => <div className={styles.statItem} key={stat.name}><span className={styles.statName}>{stat.name}</span><strong className={styles.statValue}>{stat.value}{stat.unit ? ` ${stat.unit}` : ""}</strong></div>)}
                  </div>
                )}
                <div className={styles.chartSection}>
                  <div className={styles.chartHeading}>
                    <div><p className={styles.summaryLabel}>DATA BREAKDOWN</p><h3>At a glance</h3></div>
                    <div className={styles.chartToggle} aria-label="Chart type">
                      <button type="button" className={chartType === "bar" ? styles.activeToggle : ""} aria-pressed={chartType === "bar"} onClick={() => setChartType("bar")}>Bars</button>
                      <button type="button" className={chartType === "line" ? styles.activeToggle : ""} aria-pressed={chartType === "line"} onClick={() => setChartType("line")}>Line</button>
                    </div>
                  </div>
                  {chartData.length > 0 ? (
                    <div className={styles.chart}>
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === "line" ? (
                          <LineChart data={chartData} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
                            <CartesianGrid stroke="#e8e9e3" vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <Tooltip contentStyle={{ border: "1px solid #e2e4dc", borderRadius: 4 }} />
                            <Line type="monotone" dataKey="value" stroke="#d36b4b" strokeWidth={3} dot={{ r: 4, fill: "#d36b4b", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        ) : (
                          <BarChart data={chartData} margin={{ top: 12, right: 12, left: -14, bottom: 4 }}>
                            <CartesianGrid stroke="#e8e9e3" vertical={false} />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#777c72", fontSize: 11 }} />
                            <Tooltip contentStyle={{ border: "1px solid #e2e4dc", borderRadius: 4 }} />
                            <Bar dataKey="value" fill="#258c78" radius={[3, 3, 0, 0]} maxBarSize={48} />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : <div className={styles.chartEmpty}>No chartable data points were found in this analysis.</div>}
                </div>
                {analysis.insights?.length > 0 && (
                  <div className={styles.insightsSection}>
                    <p className={styles.summaryLabel}>WHAT STANDS OUT</p>
                    <ul className={styles.insightsList}>{analysis.insights.map((insight, index) => <li key={`${index}-${insight}`}><span className={styles.insightNumber}>{String(index + 1).padStart(2, "0")}</span><span>{insight}</span></li>)}</ul>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyIllustration} aria-hidden="true"><span className={styles.emptyBarOne} /><span className={styles.emptyBarTwo} /><span className={styles.emptyBarThree} /><span className={styles.emptyLine} /></div>
                <p className={styles.sectionLabel}>YOUR CANVAS IS READY</p>
                <h2>Good data tells a story.</h2>
                <p>Upload a file or paste a dataset to see its summary, key signals, and chart.</p>
                <div className={styles.emptyFootnote}><span /> CSV / JSON supported</div>
              </div>
            )}
          </section>
        </section>
        <footer className={styles.footer}><span>DATA STUDIO</span><span>Made for curious minds</span><span>JEAN STEPHANE YAPO</span></footer>
      </main>
    </div>
  );
}
