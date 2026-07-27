import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  buffer_before_min: number;
  buffer_after_min: number;
  payment_mode: string;
  is_active: boolean;
};

export function ServicesList({ services }: { services: Service[] }) {
  if (services.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No services yet. Add your first service to start accepting bookings.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <Card key={service.id}>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">{service.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {service.duration_min} min
              </p>
            </div>
            <Badge variant={service.is_active ? "default" : "secondary"}>
              {service.is_active ? "Active" : "Inactive"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">
              {formatCurrency(service.price_cents)}
            </p>
            {service.buffer_before_min > 0 && (
              <p>Buffer before: {service.buffer_before_min} min</p>
            )}
            {service.buffer_after_min > 0 && (
              <p>Buffer after: {service.buffer_after_min} min</p>
            )}
            <p>Payment: {service.payment_mode}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
