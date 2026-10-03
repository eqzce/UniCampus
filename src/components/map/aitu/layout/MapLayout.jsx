/**
 * SVG wrapper for the AITU floor plans.
 *
 * Adapted from https://github.com/yuujiso/aitumap (MIT, see ../LICENSE.md).
 * Changes: Chakra UI / color-mode and the built-in pan-zoom wrapper were removed.
 * Pan & zoom now live in CampusMapScreen so the zoom level survives floor switches,
 * and the colours were restyled to match the UniCampus light theme.
 */
import Wallpaper from "../general/map/Wallpaper";
import IconsCommon from "../general/map/IconsCommon";

const C = {
  stroke: "#94a3b8",
  floor: "#e2e8f0",
  void: "#f4f6fa",
  room: "#3b82f6",
  roomVk: "#22a06b",
  gym: "#60a5fa",
  tech: "#cbd5e1",
  wc: "#b794d6",
  label: "#64748b",
  highlight: "#10b981",
  selected: "#f59e0b",
};

const MapLayout = ({ children }) => {
  return (
    <svg
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 924.69 396.16"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <style>
          {`
            .bg { stroke: ${C.stroke}; fill: ${C.floor}; }
            .map-groups-stairs { fill: ${C.void}; pointer-events: none; }
            .map-groups-stairs polygon, .map-groups-stairs polyline { stroke: ${C.stroke}; }
            .map-groups-stairs g path:nth-child(1) { fill: #18458b; }
            .map-groups-stairs g path:nth-child(2) { fill: #fff; }
            .map-groups-stairs-fill { fill: ${C.floor}; pointer-events: none; }
            .map-groups-stairs-fill polygon, .map-groups-stairs-fill polyline { stroke: ${C.stroke}; }
            .map-groups-stairs-fill g path:nth-child(1) { fill: #18458b; }
            .map-groups-stairs-fill g path:nth-child(2) { fill: #fff; }

            .map-groups-gym path, .map-groups-gym line,
            .map-groups-gym polygon, .map-groups-gym polyline { stroke: ${C.stroke} !important; fill: ${C.gym}; }
            .map-groups-gym-pole path, .map-groups-gym-pole line, .map-groups-gym-pole polygon {
              stroke: ${C.stroke}; stroke-miterlimit: 10; stroke-width: 0.75; fill: none !important;
            }

            .map-groups-rooms g line, .map-groups-rooms g polygon, .map-groups-rooms g polyline {
              stroke: #ffffff; stroke-width: 0.8; fill: ${C.room}; cursor: pointer; transition: fill .15s, opacity .15s;
            }
            .map-groups-rooms g text, .map-groups-rooms g span, .map-groups-rooms g path {
              stroke: #ffffff !important; stroke-width: 0.1 !important; fill: #ffffff !important;
              font: 11px sans-serif; text-rendering: optimizeSpeed !important; pointer-events: none;
            }
            .map-groups-rooms g line:hover, .map-groups-rooms g polygon:hover, .map-groups-rooms g polyline:hover { opacity: 0.8; }

            .map-groups-rooms-vk g line, .map-groups-rooms-vk g polygon, .map-groups-rooms-vk g polyline {
              stroke: #ffffff; stroke-width: 0.8; fill: ${C.roomVk}; cursor: pointer;
            }
            .map-groups-rooms-vk g text, .map-groups-rooms-vk g span, .map-groups-rooms-vk g path {
              stroke: #ffffff !important; stroke-width: 0.1 !important; fill: #ffffff !important;
              font: 11px sans-serif !important; pointer-events: none;
            }

            .map-groups-techs polygon, .map-groups-techs polyline { stroke: ${C.stroke}; fill: ${C.tech}; pointer-events: none; }
            .map-groups-techs-icon path:nth-child(1) { fill: #18458b; }
            .map-groups-techs-icon path:nth-child(2) { fill: #fff; }
            .map-groups-wcs polyline { stroke: ${C.stroke}; fill: ${C.wc}; pointer-events: none; }
            .map-groups-wcs-icon path:nth-child(1) { fill: #18458b; }
            .map-groups-wcs-icon path:nth-child(2) { fill: #fff; }
            .map-groups-escapes polygon, .map-groups-escapes polyline { stroke: ${C.stroke}; fill: ${C.tech}; pointer-events: none; }
            .map-groups-escapes-icon path:nth-child(1) { fill: #10b981; }
            .map-groups-escapes-icon path:nth-child(2) { fill: #fff; }

            .map-groups-walls path, .map-groups-walls polyline, .map-groups-walls polygon,
            .map-groups-walls rect, .map-groups-walls line { stroke: ${C.stroke}; fill: ${C.floor}; }
            .map-groups-void path, .map-groups-void polyline, .map-groups-void polygon,
            .map-groups-void rect, .map-groups-void line { stroke: ${C.stroke}; fill: ${C.void}; }
            .map-groups-coworking-atameken path, .map-groups-coworking-atameken polygon,
            .map-groups-coworking-atameken polyline { stroke: ${C.stroke}; fill: ${C.floor}; }

            .label-huge { fill: ${C.label} !important; stroke-width: 0.1 !important; }
            .label { fill: ${C.label} !important; stroke-width: 0.1 !important; }
            .label-white { fill: #ffffff !important; stroke-width: 0.1 !important; }
            .fit-text { font: 9px sans-serif !important; }

            /* UniCampus: search matches & the room the user tapped */
            .room-map-group-search-target line,
            .room-map-group-search-target polygon,
            .room-map-group-search-target polyline { fill: ${C.highlight} !important; }

            @keyframes room-selected-pulse {
              0%, 100% {
                fill: #f59e0b !important;
                filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.9));
              }
              50% {
                fill: #fbbf24 !important;
                filter: drop-shadow(0 0 14px rgba(251, 191, 36, 1));
              }
            }

            .room-map-group-selected line,
            .room-map-group-selected polygon,
            .room-map-group-selected polyline {
              fill: ${C.selected} !important;
              stroke: #ffffff !important;
              stroke-width: 1.5 !important;
              animation: room-selected-pulse 1.4s infinite ease-in-out !important;
            }
          `}
        </style>
      </defs>
      <Wallpaper />
      {children}
      <IconsCommon />
    </svg>
  );
};

export default MapLayout;
