import { SvgUri } from "react-native-svg";
import { API_BASE_URL } from "@/lib/config";

// Intrinsic aspect ratio of /brand/wordmark.svg (1709x286).
const ASPECT = 1709 / 286;

export default function BrandLogo({ width = 200 }: { width?: number }) {
  const height = Math.round(width / ASPECT);
  return <SvgUri uri={`${API_BASE_URL}/brand/wordmark.svg`} width={width} height={height} />;
}
