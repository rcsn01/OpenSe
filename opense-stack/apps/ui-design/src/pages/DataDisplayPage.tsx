import {
  Button,
  Tooltip,
  Badge,
  Body,
  Avatar,
  AvatarGroup,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  Container,
  VStack,
  HStack,
} from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

export function DataDisplayPage() {
  return (
    <Container size="lg" className="py-8">
      <Section title="Data Display">
        <SubSection title="Avatars">
          <HStack gap={3} wrap align="center">
            <Avatar size="xs" fallback="XS" />
            <Avatar size="sm" fallback="SM" />
            <Avatar size="md" alt="John Doe" fallback="JD" />
            <Avatar size="lg" alt="Jane Smith" fallback="JS" />
            <Avatar size="xl" alt="Admin" fallback="A" />
          </HStack>
          <Body size="body5" muted className="mt-2">
            Avatar Group:
          </Body>
          <AvatarGroup>
            <Avatar size="sm" fallback="A" className="ring-2 ring-[var(--color-background)]" />
            <Avatar size="sm" fallback="B" className="ring-2 ring-[var(--color-background)]" />
            <Avatar size="sm" fallback="C" className="ring-2 ring-[var(--color-background)]" />
            <Avatar size="sm" fallback="+3" className="ring-2 ring-[var(--color-background)]" />
          </AvatarGroup>
        </SubSection>

        <SubSection title="Table">
          <Card padding="none">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>Name</TableCell>
                  <TableCell header>Status</TableCell>
                  <TableCell header>Role</TableCell>
                  <TableCell header>Email</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  {
                    name: 'Alice Johnson',
                    status: 'Active',
                    role: 'Admin',
                    email: 'alice@example.com',
                  },
                  {
                    name: 'Bob Smith',
                    status: 'Inactive',
                    role: 'Editor',
                    email: 'bob@example.com',
                  },
                  {
                    name: 'Carol Williams',
                    status: 'Active',
                    role: 'Viewer',
                    email: 'carol@example.com',
                  },
                ].map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === 'Active' ? 'success' : 'secondary'}
                        size="sm"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell>
                      <Body size="body4" muted>
                        {row.email}
                      </Body>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </SubSection>

        <SubSection title="Tooltip">
          <HStack gap={4}>
            <Tooltip content="Top tooltip" side="top">
              <Button variant="outline" size="sm">
                Top
              </Button>
            </Tooltip>
            <Tooltip content="Bottom tooltip" side="bottom">
              <Button variant="outline" size="sm">
                Bottom
              </Button>
            </Tooltip>
            <Tooltip content="Left tooltip" side="left">
              <Button variant="outline" size="sm">
                Left
              </Button>
            </Tooltip>
            <Tooltip content="Right tooltip" side="right">
              <Button variant="outline" size="sm">
                Right
              </Button>
            </Tooltip>
          </HStack>
        </SubSection>
      </Section>
    </Container>
  )
}
