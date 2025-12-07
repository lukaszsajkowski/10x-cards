import { CheckCircle2, Mail } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ResetPasswordSuccessProps {
  message: string;
}

export function ResetPasswordSuccess({ message }: ResetPasswordSuccessProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-6 text-primary" />
        </div>
        <CardTitle className="text-2xl">Sprawdź swoją skrzynkę</CardTitle>
        <CardDescription className="text-base">{message}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Co dalej?</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>1. Otwórz swoją skrzynkę email</li>
                <li>2. Znajdź wiadomość od 10x Cards</li>
                <li>3. Kliknij link, aby ustawić nowe hasło</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Nie otrzymałeś wiadomości? Sprawdź folder spam lub{" "}
          <a
            href="/auth/reset-password"
            className="text-primary underline-offset-4 hover:underline"
          >
            spróbuj ponownie
          </a>
        </p>
      </CardContent>

      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <a href="/auth/login">Wróć do logowania</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
