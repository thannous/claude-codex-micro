import { JOYSTICK_DIRECTION_COUNTS, radialSectorGeometry } from "../../../shared/input-profile.mjs";

const SIZE = 140;
const CENTER = SIZE / 2;
const INNER_RADIUS = 32;
const OUTER_RADIUS = 64;

function polar(radius, angle) {
  const radians = angle * 2 * Math.PI;
  return [
    CENTER + radius * Math.cos(radians),
    CENTER - radius * Math.sin(radians),
  ];
}

function sectorPath(a1, a2) {
  const span = (a2 - a1 + 1) % 1;
  const large = span > 0.5 ? 1 : 0;
  const [x1, y1] = polar(OUTER_RADIUS, a1);
  const [x2, y2] = polar(OUTER_RADIUS, a2);
  const [x3, y3] = polar(INNER_RADIUS, a2);
  const [x4, y4] = polar(INNER_RADIUS, a1);
  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${large} 1 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function sectorCentroid(a1, a2) {
  const span = (a2 - a1 + 1) % 1;
  return polar((INNER_RADIUS + OUTER_RADIUS) / 2, (a1 + span / 2) % 1);
}

export function createJoystickDialGeometry(directions) {
  const geometry = radialSectorGeometry(directions);
  const decorate = ({ index, a1, a2 }) => ({
    index,
    path: sectorPath(a1, a2),
    centroid: sectorCentroid(a1, a2),
  });
  return {
    close: decorate({ index: -1, ...geometry.close }),
    sectors: geometry.sectors.map(decorate),
  };
}

const GEOMETRY_BY_DIRECTION = new Map(
  JOYSTICK_DIRECTION_COUNTS.map((directions) => [
    directions,
    createJoystickDialGeometry(directions),
  ]),
);

const percent = (value) => `${(value / SIZE) * 100}%`;

// The badges are non-interactive spans. The SVG sectors remain the single
// accessible control for each direction.
export function JoystickDial({
  directions,
  sectors,
  selectedIndex,
  onSelect,
  badgeFor,
  sectorTitle,
  closeTitle,
}) {
  const geometry =
    GEOMETRY_BY_DIRECTION.get(directions) ?? createJoystickDialGeometry(directions);
  const badges = sectors.map(badgeFor);

  return (
    <div className="joystick-dial-wrap">
      <svg
        className="joystick-dial"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="group"
        aria-label={sectorTitle}
      >
        <path className="joystick-dial-close" d={geometry.close.path}>
          <title>{closeTitle}</title>
        </path>
        <text
          className="joystick-dial-glyph"
          x={geometry.close.centroid[0]}
          y={geometry.close.centroid[1]}
        >
          ✕
        </text>

        {geometry.sectors.map(({ index, path }) => {
          const active = selectedIndex === index;
          return (
            <g
              key={index}
              className={`joystick-dial-sector${active ? " is-active" : ""}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              aria-label={`${sectorTitle} ${index + 1} : ${badges[index].title}`}
              onClick={() => onSelect(index)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect(index);
              }}
            >
              <path d={path} />
            </g>
          );
        })}
      </svg>

      {geometry.sectors.map(({ index, centroid }) => {
        const badge = badges[index];
        return (
          <span
            key={index}
            className={`joystick-dial-badge${selectedIndex === index ? " is-active" : ""}${
              badge.assigned ? " is-assigned" : ""
            }`}
            style={{ left: percent(centroid[0]), top: percent(centroid[1]) }}
            aria-hidden="true"
          >
            {badge.label}
          </span>
        );
      })}
    </div>
  );
}
