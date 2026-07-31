import { ProfileLoader } from "./ProfileLoader.jsx";
import { ProfileReview } from "./ProfileReview.jsx";

export function ProfileExportPanel({
  t,
  refs,
  profile,
  onLoadSourceProfile,
  onResolveMappingConflict,
  onAppSenseChange,
  onRunReview,
  onDownloadReview,
}) {
  return (
    <>
      <ProfileLoader
        t={t}
        loaderRef={refs.loader}
        profileInputRef={refs.profileInput}
        profile={profile}
        onLoadSourceProfile={onLoadSourceProfile}
        onResolveMappingConflict={onResolveMappingConflict}
      />
      <ProfileReview
        t={t}
        reviewRef={refs.review}
        profile={profile}
        onAppSenseChange={onAppSenseChange}
        onRunReview={onRunReview}
        onDownloadReview={onDownloadReview}
      />
    </>
  );
}
