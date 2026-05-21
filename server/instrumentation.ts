import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";

const enabled = !!process.env.GRAFANA_OTLP_ENDPOINT;

function buildTraceExporter() {
  if (!enabled) return undefined;

  const auth = Buffer.from(
    `${process.env.GRAFANA_INSTANCE_ID}:${process.env.GRAFANA_API_TOKEN}`
  ).toString("base64");

  return new OTLPTraceExporter({
    url: `${process.env.GRAFANA_OTLP_ENDPOINT}/v1/traces`,
    headers: { Authorization: `Basic ${auth}` },
  });
}

function buildMetricsReader() {
  // Exposes /metrics on port 9464 for local Prometheus to scrape
  const exporter = new PrometheusExporter({ port: 9464 }, () => {
    console.log("[OTEL] Prometheus metrics available at http://localhost:9464/metrics");
  });
  return exporter;
}

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? "impact-lab",
  traceExporter: buildTraceExporter(),
  metricReader: buildMetricsReader(),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false }, // too noisy
    }),
  ],
});

sdk.start();
console.log(`[OTEL] Instrumentation started. Traces → ${enabled ? "Grafana Cloud" : "disabled"}`);

process.on("SIGTERM", () => {
  sdk.shutdown().catch((err) => console.error("[OTEL] Shutdown error:", err));
});
