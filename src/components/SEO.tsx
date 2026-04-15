import { Helmet } from "react-helmet-async";

const SITE_NAME = "African Halal Institute";
const BASE_URL = "https://africahalal.lovable.app";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`;

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  ogType?: "website" | "article";
  ogImage?: string;
  structuredData?: Record<string, unknown>;
  noIndex?: boolean;
}

export function SEO({
  title,
  description,
  keywords,
  canonicalPath,
  ogType = "website",
  ogImage,
  structuredData,
  noIndex = false,
}: SEOProps) {
  const canonical = canonicalPath ? `${BASE_URL}${canonicalPath}` : undefined;
  const image = ogImage || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {canonical && <link rel="canonical" href={canonical} />}
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />
      {canonical && <meta property="og:url" content={canonical} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* JSON-LD */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
