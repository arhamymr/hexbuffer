import { Code2Icon, ExternalLinkIcon, Triangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PROFILE_LINKS } from '../constants';

export function AboutSettingsTab() {
  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-green-500">
          <Triangle className="size-4" />
          About hexbuffer
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          hexbuffer is my personal project for exploring, testing, and understanding web application traffic.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code2Icon className="size-5 text-primary" />
            <CardTitle>Arham</CardTitle>
          </div>
          <CardDescription>Software Developer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            I build tools that help make development, testing, and security research more practical. hexbuffer is part of
            that work: a focused desktop app for inspecting requests, repeating traffic, and shaping better workflows.
          </p>

          <div className="flex flex-wrap gap-2">
            {PROFILE_LINKS.map(({ label, href, Icon }) => (
              <Button key={href} asChild variant="outline">
                <a href={href} target="_blank" rel="noreferrer">
                  <Icon className="size-4" />
                  {label}
                  <ExternalLinkIcon className="size-3" />
                </a>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
