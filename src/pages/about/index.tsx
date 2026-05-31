import { Code2, ExternalLink, GitBranch, MessageCircle, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const profileLinks = [
  {
    label: 'Threads',
    href: 'https://www.threads.com/@arhamymr',
    Icon: MessageCircle,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/arhamymr',
    Icon: GitBranch,
  },
];

export function AboutPage() {
  return (
    <div className="h-full overflow-auto px-6 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-500">
            <UserRound className="size-4" />
            Personal Project
          </div>
          <h1 className="text-3xl font-normal tracking-normal">About AppRecon</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            AppRecon is my personal project for exploring, testing, and understanding web application traffic.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code2 className="size-5 text-primary" />
              <CardTitle>Arham</CardTitle>
            </div>
            <CardDescription>Software Developer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              I build tools that help make development, testing, and security research more practical. AppRecon is part of
              that work: a focused desktop app for inspecting requests, repeating traffic, and shaping better workflows.
            </p>

            <div className="flex flex-wrap gap-2">
              {profileLinks.map(({ label, href, Icon }) => (
                <Button key={href} asChild variant="outline">
                  <a href={href} target="_blank" rel="noreferrer">
                    <Icon className="size-4" />
                    {label}
                    <ExternalLink className="size-3" />
                  </a>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
