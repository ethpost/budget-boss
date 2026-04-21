export default function Loading() {
  return (
    <main className="screen">
      <section className="hero">
        <div className="eyebrow">Budget Health</div>
        <div className="skeleton skeletonLine" />
        <div className="skeleton skeletonLine skeletonLine--wide" />
        <div className="panelGrid">
          <div className="panel">
            <div className="skeleton skeletonLine skeletonLine--short" />
            <div className="skeleton skeletonBlock" />
            <div className="skeleton skeletonLine" />
          </div>
          <div className="panel">
            <div className="skeleton skeletonLine skeletonLine--short" />
            <div className="skeleton skeletonBlock" />
            <div className="skeleton skeletonLine" />
          </div>
          <div className="panel">
            <div className="skeleton skeletonLine skeletonLine--short" />
            <div className="skeleton skeletonBlock" />
            <div className="skeleton skeletonLine" />
          </div>
          <div className="panel">
            <div className="skeleton skeletonLine skeletonLine--short" />
            <div className="skeleton skeletonBlock" />
            <div className="skeleton skeletonLine" />
          </div>
        </div>
      </section>
    </main>
  );
}
