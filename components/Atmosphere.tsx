/** Shared night atmosphere: drifting aurora blobs + grain over deep ink. */
export function Atmosphere() {
  return (
    <div className="atmo" aria-hidden="true">
      <div className="atmo__blob atmo__blob--shu" />
      <div className="atmo__blob atmo__blob--jade" />
      <div className="atmo__blob atmo__blob--indigo" />
      <div className="atmo__grain" />
    </div>
  );
}
