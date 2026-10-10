import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, EmptyState, ErrorBanner, InfoNote, Spinner } from "../components/ui";
import { api } from "../services/api";

const KEYS: [string, string][] = [
  ["accuracy", "Accuracy"],
  ["precision", "Precision"],
  ["recall", "Recall"],
  ["f1", "F1 Score"],
  ["roc_auc", "ROC-AUC"],
  ["average_precision", "Avg Precision"],
];
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function Model() {
  const [m, setM] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.modelMetrics(), api.modelInfo()])
      .then(([a, b]) => { setM(a); setInfo(b); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!m || !info) return <Spinner label="Loading neural graph metrics & topology benchmarks..." />;

  const customTooltipStyle = {
    backgroundColor: "#0D0E12",
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#FFFFFF",
    fontSize: "12px",
    fontFamily: "monospace",
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-white/10 pb-6">
        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#00F2FE]">
          <span>[ 08 // GCN MODEL & BENCHMARK ]</span>
          <span className="text-white/20">•</span>
          <span className="text-white/40">2-LAYER GRAPH CONVOLUTIONAL NETWORK</span>
        </div>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
          Model Topology & Evaluation
        </h1>
        <p className="mt-2 text-sm text-white/60 max-w-2xl font-light">
          Graph neural link prediction architecture trained over the biomedical knowledge graph. Benchmarked across held-out positive interaction pairs and 5-fold cross-validation.
        </p>
      </div>

      <div className="mb-4">
        <InfoNote tone="warn">
          {info.dataset_label} Metrics below reflect validation on the demonstration graph partition. All link scores serve as clinical decision support.
        </InfoNote>
      </div>

      <Card title="GCN Neural Architecture">
        <ol className="grid gap-4 md:grid-cols-3">
          {info.architecture.map((s: string, i: number) => (
            <li key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs">
              <span className="font-mono text-sm font-bold text-[#00F2FE] block mb-1">
                [ 0{i + 1} // LAYER ]
              </span>
              <span className="text-white/90 leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs font-mono text-white/50">
          Engine: <b className="text-white">{info.model}</b>. Computes symmetric-normalized adjacency propagation with self-loop feature aggregation.
        </p>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Knowledge Graph Census">
          <dl className="space-y-2 text-xs">
            {Object.entries(info.graph.node_counts).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/5 pb-1">
                <dt className="capitalize text-white/50">{k.replace("_", " ")} Nodes</dt>
                <dd className="font-mono font-bold text-white">{String(v)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-b border-white/5 pb-1 pt-1">
              <dt className="text-white/50">Biological Knowledge Edges</dt>
              <dd className="font-mono font-bold text-[#00F2FE]">{info.graph.knowledge_edges}</dd>
            </div>
            <div className="flex justify-between pt-1">
              <dt className="text-white/50">Interaction Edges</dt>
              <dd className="font-mono font-bold text-white">{info.graph.known_interaction_pairs}</dd>
            </div>
          </dl>
        </Card>

        {m.available && (
          <>
            <Card title="Dataset Partitioning">
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <dt className="text-white/50">Train (Positive Pairs)</dt>
                  <dd className="font-mono font-bold text-white">{m.split.train_positive}</dd>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-1">
                  <dt className="text-white/50">Validation Set</dt>
                  <dd className="font-mono font-bold text-white">{m.split.validation_positive}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt className="text-white/50">Held-Out Test Set</dt>
                  <dd className="font-mono font-bold text-[#00F2FE]">{m.split.test_positive}</dd>
                </div>
                <p className="pt-2 text-[11px] font-mono text-white/40 border-t border-white/5">
                  Sampled Negatives: {m.split.negatives} · Seed {m.split.seed} · Trained {new Date(m.trained_at).toLocaleDateString()}
                </p>
              </dl>
            </Card>

            <Card title="Hyperparameter Tuning">
              <dl className="space-y-1.5 text-xs">
                {Object.entries(m.hyperparameters).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-white/5 pb-1">
                    <dt className="capitalize font-mono text-white/50">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-mono text-right text-white font-medium">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </>
        )}
      </div>

      {!m.available ? (
        <EmptyState title="Weights Not Trained" text={m.message} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {KEYS.map(([k, label], idx) => (
              <div key={k} className="rounded-2xl border border-white/10 bg-prey-card/80 p-5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs font-mono text-white/40">
                  <span>[ 0{idx + 1} // {label.toUpperCase()} ]</span>
                  <span>HELD-OUT</span>
                </div>
                <div className="mt-2 font-mono text-3xl font-extrabold text-white tracking-tight">
                  {pct(m.test[k])}
                </div>
                <div className="mt-2 text-xs font-mono text-[#00F2FE]">
                  5-Fold CV: {pct(m.cross_validation.mean[k])} ± {pct(m.cross_validation.std[k])}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Held-Out Test vs Cross-Validation Folds">
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={KEYS.map(([k, l]) => ({ name: l, test: +(m.test[k] * 100).toFixed(1), cv: +(m.cross_validation.mean[k] * 100).toFixed(1) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }} />
                    <Bar dataKey="test" name="Held-Out Test" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cv" name="CV Mean" fill="#00F2FE" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Loss Convergence & Validation Precision">
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={m.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Legend verticalAlign="top" wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }} />
                    <Line type="monotone" dataKey="loss" name="Training Loss" stroke="#FF3366" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="val_average_precision" name="Val Avg Precision" stroke="#00F2FE" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Receiver Operating Characteristic (ROC)">
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={m.curves.roc.map(([x, y]: number[]) => ({ fpr: x, tpr: y }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="fpr" type="number" domain={[0, 1]} label={{ value: "False Positive Rate", position: "insideBottom", offset: -2, fontSize: 11, fill: "#666" }} tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis domain={[0, 1]} label={{ value: "True Positive Rate", angle: -90, position: "insideLeft", fontSize: 11, fill: "#666" }} tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Line type="stepAfter" dataKey="tpr" name="ROC (AUC)" stroke="#00F2FE" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Precision-Recall Curve (PR)">
              <div className="h-72">
                <ResponsiveContainer>
                  <LineChart data={m.curves.pr.map(([x, y]: number[]) => ({ recall: x, precision: y }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="recall" type="number" domain={[0, 1]} label={{ value: "Recall", position: "insideBottom", offset: -2, fontSize: 11, fill: "#666" }} tick={{ fontSize: 11, fill: "#888" }} />
                    <YAxis domain={[0, 1]} label={{ value: "Precision", angle: -90, position: "insideLeft", fontSize: 11, fill: "#666" }} tick={{ fontSize: 11, fill: "#888" }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Line type="stepAfter" dataKey="precision" name="PR Curve" stroke="#FFFFFF" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
