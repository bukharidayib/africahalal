import { Helmet } from "react-helmet-async";

interface StructuredDataProps {
  data: Record<string, any>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "African Halal Institute",
  alternateName: "AHI",
  url: "https://africanhalaal.com",
  logo: "https://africanhalaal.com/logo.png",
  description: "Leading Halal Certification Authority in Zambia and Africa. Integrity, Compliance, and Leadership in Halal Standards.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Matero",
    addressLocality: "Lusaka",
    addressCountry: "ZM",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+260972044414",
    contactType: "customer service",
    email: "info@africanhalaal.com",
    areaServed: "ZM",
    availableLanguage: "English",
  },
  sameAs: [],
  areaServed: {
    "@type": "Country",
    name: "Zambia",
  },
};

export const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "African Halal Institute",
  image: "https://africanhalaal.com/logo.png",
  url: "https://africanhalaal.com",
  telephone: "+260972044414",
  email: "info@africanhalaal.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Matero",
    addressLocality: "Lusaka",
    addressCountry: "ZM",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: -15.3875,
    longitude: 28.3228,
  },
  priceRange: "$$",
  openingHours: "Mo-Fr 08:00-17:00",
};

export function createFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function createBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
