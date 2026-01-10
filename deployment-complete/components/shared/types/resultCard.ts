export interface StudentResultCardProps {
  result: any;
  student?: any;
  studentClass?: any;
  detailedScores?: any[];
  currentUser?: any;
  showActions?: boolean;
  onApprovePrint?: (resultId: number) => void;
  onDownload?: (resultId: number) => void;
  onPrint?: (resultId: number) => void;
}
