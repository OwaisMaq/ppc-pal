
import { Calendar, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const HolidayReminder = () => {
  const getUpcomingHoliday = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Define major US shopping holidays/events
    const holidays = [
      { name: "Valentine's Day", date: new Date(currentYear, 1, 14), icon: Gift },
      { name: "Prime Day", date: new Date(currentYear, 6, 11), icon: Gift }, // July 11-12
      { name: "Back to School", date: new Date(currentYear, 7, 1), icon: Calendar }, // August
      { name: "Black Friday", date: new Date(currentYear, 10, 24), icon: Gift }, // Approximate
      { name: "Cyber Monday", date: new Date(currentYear, 10, 27), icon: Calendar }, // Approximate
      { name: "Holiday Shopping", date: new Date(currentYear, 11, 1), icon: Gift }, // December
    ];

    // Add next year's holidays if we're near the end of the year
    if (now.getMonth() >= 10) {
      holidays.push(
        { name: "Valentine's Day", date: new Date(currentYear + 1, 1, 14), icon: Gift },
        { name: "Prime Day", date: new Date(currentYear + 1, 6, 11), icon: Gift }
      );
    }

    // Find the next upcoming holiday
    const upcomingHolidays = holidays
      .filter(holiday => holiday.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return upcomingHolidays[0] || null;
  };

  const getDaysUntil = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const upcomingHoliday = getUpcomingHoliday();

  if (!upcomingHoliday) return null;

  const daysUntil = getDaysUntil(upcomingHoliday.date);
  const Icon = upcomingHoliday.icon;

  return (
    <div className="flex items-center justify-center mb-4">
      <Badge 
        variant="outline" 
        className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-700 px-4 py-2"
      >
        <Icon className="h-4 w-4 mr-2" />
        <span className="font-medium">
          {upcomingHoliday.name} in {daysUntil} days
        </span>
        <span className="ml-2 text-purple-600">📈</span>
      </Badge>
    </div>
  );
};

export default HolidayReminder;
