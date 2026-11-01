-- Retratos dos números de cada post do Instagram (ferramenta ver_desempenho_posts)
CREATE TABLE "post_metrics" (
    "id" TEXT NOT NULL,
    "ig_user_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "collected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "media_type" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "caption" TEXT,
    "permalink" TEXT,
    "published_at" TIMESTAMP(3) NOT NULL,
    "views" INTEGER,
    "reach" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saved" INTEGER,
    "total_interactions" INTEGER,
    "reposts" INTEGER,
    "avg_watch_time_ms" INTEGER,
    "view_total_time_ms" DOUBLE PRECISION,
    "skip_rate" DOUBLE PRECISION,
    "unavailable" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "post_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "post_metrics_media_id_collected_at_idx" ON "post_metrics"("media_id", "collected_at" DESC);
CREATE INDEX "post_metrics_ig_user_id_published_at_idx" ON "post_metrics"("ig_user_id", "published_at");
CREATE INDEX "post_metrics_collected_at_idx" ON "post_metrics"("collected_at");
