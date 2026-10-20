"use client";

import { useEffect, useState } from "react";
import { fetchNewsForPlaces, buildLocationWeatherNewsUrl, NewsItem } from "@/lib/news";

export function getNewsItemHref(item: NewsItem): string {
  let location = item.locationName;
  if (!location) {
    const match = item.title.match(/^\[(.*?)\]/);
    if (match) {
      location = match[1].trim();
    }
  }
  if (location) {
    return buildLocationWeatherNewsUrl(location, item.countryCode);
  }
  return item.link || "#";
}

export function NewsTicker({ places, activePlaceId }: { places: any[]; activePlaceId?: number | null }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    if (!places || places.length === 0) {
      setIsLoading(false);
      setNews([]);
      return;
    }

    const fetchNews = async (silent = false) => {
      try {
        if (!silent) setIsLoading(true);
        const allNewsItems = await fetchNewsForPlaces(places, activePlaceId);
        if (active) {
          // Extract user's active / saved location names
          const userLocations: string[] = Array.from(
            new Set(
              places
                .flatMap((p) => {
                  const raw = (p.name || "").trim();
                  const clean = raw.split(/[—–-]/)[0].trim();
                  return [clean, raw];
                })
                .filter(Boolean)
            )
          );

          // Strictly filter items: items.filter(item => userLocations.includes(item.locationName))
          const filteredItems = (allNewsItems || []).filter(
            (item) => item.locationName && userLocations.includes(item.locationName)
          );

          setNews(filteredItems);
        }
      } catch (e) {
        console.error("Failed to fetch news:", e);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    
    // Initial fetch
    const timer = setTimeout(() => fetchNews(false), 500);

    // Polling every 5 minutes (300,000 ms)
    const pollInterval = setInterval(() => fetchNews(true), 5 * 60 * 1000);

    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(pollInterval);
    };
  }, [places.map(p => p.id || p.name).join(","), activePlaceId]);

  return (
    <div className="flex items-center overflow-hidden bg-slate-900/60 backdrop-blur-md border-y border-slate-800/80 mb-4 h-[38px] w-full relative -mx-3 md:-mx-6 px-3 md:px-6">
      {/* Marquee Container */}
      <div className="flex-1 overflow-hidden h-full flex items-center relative whitespace-nowrap group">
        <style>{`
          @keyframes news-marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-news-marquee {
            animation: news-marquee 140s linear infinite;
            display: inline-block;
          }
        `}</style>
        
        {isLoading ? (
          <div className="text-[13px] text-slate-400 animate-pulse flex items-center h-full w-full">
            <span className="mx-4 text-orange-500/50 font-bold text-lg leading-none">•</span>
            Fetching latest weather advisories...
          </div>
        ) : news.length === 0 ? (
          <div className="text-[13px] text-slate-300 flex items-center h-full w-full">
            <span className="mx-4 text-green-500 font-bold text-lg leading-none">•</span>
            Monitoring live meteorological data across all configured locations...
          </div>
        ) : (
          <div 
            className="inline-block animate-news-marquee group-hover:[animation-play-state:paused] pr-4"
            style={{ animationDuration: `${Math.max(110, news.length * 15)}s` }}
          >
            {[1, 2, 3, 4].map((block) => (
              <span key={block} className="inline-flex items-center">
                {news.map((item, i) => (
                  <span key={`${block}-${i}`} className="text-[13px] text-slate-200 hover:text-white transition-colors inline-flex items-center">
                    <a href={getNewsItemHref(item)} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.title}</a>
                    <span className="mx-4 text-orange-500 font-bold text-lg leading-none">•</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
