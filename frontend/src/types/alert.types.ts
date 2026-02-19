export type AlertStatus = 'TRIGGERED' | 'SENT' | 'ACKED' | 'RESOLVED' | 'FAILED';

export interface AlertEvent {
  id: number;
  rule: number;
  rule_name: string;
  glycemia_value: number;
  triggered_at: string;
  status: AlertStatus;
  error_message: string | null;
}
