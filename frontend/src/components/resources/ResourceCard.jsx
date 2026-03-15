import React, { useState } from "react";
import { formatDate } from "../../utils/dateUtils";

// Helper: Responsive YouTube/Video Embed with Striver TUF style
function VideoEmbed({ url, title }) {
  const [play, setPlay] = useState(false);
  return (
    <div className="w-full aspect-w-16 aspect-h-9 mb-3 relative rounded-xl overflow-hidden shadow-lg group">
      {!play && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 transition group-hover:bg-opacity-60 z-10 w-full h-full"
          onClick={() => setPlay(true)}
          aria-label="Play video"
        >
          <span className="bg-white bg-opacity-80 rounded-full p-4 shadow-lg">
            <svg className="w-10 h-10 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
      {play && (
        <iframe
          src={url}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full rounded-xl border-none"
        ></iframe>
      )}
      {/* Thumbnail fallback for SEO/preview (optional) */}
      {/* <img src={thumbnail} alt={title} className="absolute w-full h-full object-cover opacity-0" /> */}
    </div>
  );
}

// Helper: FAQ Accordion
function FAQAccordion({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2 border rounded">
      <button
        className="w-full text-left px-3 py-2 font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none flex justify-between items-center"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>Q: {question}</span>
        <span className="ml-2">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 text-gray-800 border-t bg-white">A: {answer}</div>
      )}
    </div>
  );
}

const typeLabels = {
  "youtube-video": "YouTube Video",
  pdf: "PDF",
  image: "Image",
  blog: "Blog",
  faq: "FAQ",
  website: "Website",
  news: "News",
  "case-study": "Case Study",
  "event-report": "Event Report",
  interview: "Interview",
  podcast: "Podcast",
  workshop: "Workshop",
};

const domainColors = {
  "Beach Cleanup": "bg-blue-100 text-blue-800",
  "Tree Plantation": "bg-green-100 text-green-800",
  "Awareness Drive": "bg-yellow-100 text-yellow-800",
  "Animal Rescue": "bg-orange-100 text-orange-800",
  Education: "bg-purple-100 text-purple-800",
};

export default function ResourceCard({ resource }) {
  // Video types
  const isVideo = [
    "youtube-video",
    "interview",
    "podcast",
    "workshop",
  ].includes(resource.type);

  // PDF
  const isPDF = resource.type === "pdf";

  // Image types
  const isImage = ["image", "poster", "infographic"].includes(resource.type);

  // Blog/news/case-study
  const isContent = ["blog", "news", "case-study", "event-report"].includes(resource.type);

  // FAQ
  const isFAQ = resource.type === "faq";

  // Website
  const isWebsite = resource.type === "website";

  return (
    <div className="bg-white rounded-lg shadow p-5 flex flex-col h-full border hover:shadow-lg transition">
      {/* Thumbnail or Video Embed */}
      {isVideo && resource.url ? (
        <VideoEmbed url={resource.url} title={resource.title} />
      ) : isImage && resource.thumbnail ? (
        <a href={resource.url || resource.thumbnail} target="_blank" rel="noopener noreferrer">
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-40 object-cover rounded mb-3 hover:opacity-90 transition"
          />
        </a>
      ) : isPDF && resource.thumbnail ? (
        <a href={resource.url} target="_blank" rel="noopener noreferrer">
          <img
            src={resource.thumbnail}
            alt={resource.title}
            className="w-full h-40 object-cover rounded mb-3 hover:opacity-90 transition border"
          />
        </a>
      ) : null}

      <div className="flex-1 flex flex-col">
        {/* Title */}
        <h2 className="text-lg font-bold mb-1 text-blue-700 line-clamp-2">{resource.title}</h2>
        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${domainColors[resource.domain] || "bg-gray-100 text-gray-700"}`}>{resource.domain}</span>
          <span className="px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 font-semibold">{typeLabels[resource.type] || resource.type}</span>
          {resource.language && <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">{resource.language.toUpperCase()}</span>}
        </div>
        {/* Summary */}
        {resource.summary && <p className="text-gray-700 text-sm mb-2 line-clamp-3">{resource.summary}</p>}
        {/* FAQ Accordion */}
        {isFAQ && resource.question && resource.answer && (
          <FAQAccordion question={resource.question} answer={resource.answer} />
        )}
        {/* Blog/News/Case Study Content */}
        {isContent && resource.content && (
          <div className="prose prose-sm max-w-none mb-2 text-gray-800">
            <div dangerouslySetInnerHTML={{ __html: resource.content }} />
          </div>
        )}
        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {resource.tags.map((tag, i) => (
              <span key={i} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs">#{tag}</span>
            ))}
          </div>
        )}
        {/* PDF Button */}
        {isPDF && resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-sm text-center"
            download
          >
            View / Download PDF
          </a>
        )}
        {/* Image Full View Button */}
        {isImage && resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 font-medium text-sm text-center"
          >
            View Full Image
          </a>
        )}
        {/* Website Link */}
        {isWebsite && resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block px-4 py-2 bg-green-50 text-green-700 rounded hover:bg-green-100 font-medium text-sm text-center"
          >
            Visit Website
          </a>
        )}
        {/* Source */}
        {resource.source && (
          <p className="text-xs text-gray-400 mt-1">Source: {resource.source}</p>
        )}
      </div>
      {/* Created At */}
      <div className="text-xs text-gray-400 mt-3">Added on {formatDate(resource.createdAt)}</div>
    </div>
  );
}
