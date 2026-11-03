import { redirect } from 'next/navigation';

// Native app links and older notifications must use the persisted hospital schedule.
export default function LegacyHospitalAppointmentsPage() {
  redirect('/partner/reservations');
}
