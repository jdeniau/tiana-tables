import type { ReactElement } from 'react';
import { useDetectedPlatform } from './DownloadPick';
import { RegionHead } from './Frame';
import { PLATFORM_PACKAGES } from './platform';
import { PackageKind, type Release, repositoryUrl } from './release';
import { type SiteKey, useText } from './text';

const ROW_LABELS: Record<PackageKind, SiteKey> = {
  [PackageKind.Deb]: 'download.row.deb',
  [PackageKind.Rpm]: 'download.row.rpm',
  [PackageKind.MacArm]: 'download.row.macArm',
  [PackageKind.MacIntel]: 'download.row.macIntel',
  [PackageKind.WindowsSetup]: 'download.row.windowsSetup',
};

export function DownloadSection({
  release,
}: {
  release: Release;
}): ReactElement {
  const { site, rich } = useText();
  const detected = useDetectedPlatform();
  const mine = detected ? PLATFORM_PACKAGES[detected.platform] : [];

  return (
    <section className="region" id="download">
      <RegionHead
        name={site('download.title')}
        meta={site('download.meta', { version: release.version })}
      />
      <div className="split wide-left">
        <div className="prose">
          <div className="tblscroll">
            <table className="dl">
              <thead>
                <tr>
                  <th>{site('download.platform')}</th>
                  <th>{site('download.file')}</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(PackageKind).map((kind) => (
                  <tr
                    key={kind}
                    className={mine.includes(kind) ? 'mine' : undefined}
                  >
                    <td className="o">{site(ROW_LABELS[kind])}</td>
                    <td>
                      <a href={release.files[kind].url}>
                        {release.files[kind].name}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="quiet">
            {rich('download.all', `${repositoryUrl}/releases/latest`)}
          </p>
        </div>
        <div className="prose">
          <p>{site('download.source')}</p>
          <pre className="shell">
            {[
              'npm install -g corepack',
              'corepack enable yarn',
              'yarn install',
              'yarn start',
            ].map((command) => (
              <span key={command} className="line">
                <span className="p">$ </span>
                {command}
              </span>
            ))}
          </pre>
          <p className="quiet">
            {rich(
              'download.contributing',
              `${repositoryUrl}/blob/main/.github/CONTRIBUTING.md`
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
