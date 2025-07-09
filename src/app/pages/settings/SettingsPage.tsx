import { RequestInfo } from "rwsdk/worker";

export default function SettingsPage(requestInfo: RequestInfo) {
  const { ctx } = requestInfo;  // Destructure ctx from requestInfo
  
  return (
    <div>
      <p>Organization: {ctx.organization?.name}</p>
      <p>
        {ctx.user?.username
          ? `You are logged in as user ${ctx.user.username}`
          : "You are not logged in"}
      </p>
    </div>
  );
}