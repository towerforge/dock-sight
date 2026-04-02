import { useState } from "react"
import { Folder, FileText } from "lucide-react"
import { Button, Input, Select, Card, CardHeader, CardBody, CardFooter, Grid, Col, Text, Modal, Page, Tabs, TabBar, Tab, TabPanel, Table, TableHead, TableBody, Th, Tr, Td, TableCell } from "@/components/ui"

const OPTIONS = [
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" },
    { value: "3", label: "Opción 3" },
]

export default function Dev() {
    const [modal, setModal] = useState(false)

    return (
        <Page>
            <Text variant="title">Componentes UI</Text>
            <Text variant="subtitle">Ejemplo de la librería base</Text>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Botones</Text>
            <Grid gap={8} align="center" style={{ marginBottom: 32 }}>
                <Col span={12} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button variant={1}>Primary</Button>
                    <Button variant={2}>Secondary</Button>
                    <Button variant={3}>Outline</Button>
                    <Button variant={4}>Subtle</Button>
                    <Button variant={5}>Danger</Button>
                    <Button variant={1} loading>Loading</Button>
                    <Button variant={2} size="sm">Small</Button>
                    <Button variant={2} size="lg">Large</Button>
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Inputs</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} md={4}>
                    <Input label="Nombre" placeholder="Escribe algo..." />
                </Col>
                <Col span={12} md={4}>
                    <Input label="Con error" placeholder="Campo erróneo" error="Este campo es obligatorio" />
                </Col>
                <Col span={12} md={4}>
                    <Input label="Con hint" placeholder="Sugerencia" hint="Máximo 50 caracteres" />
                </Col>
                <Col span={12} md={6}>
                    <Select label="Selector" options={OPTIONS} placeholder="Elige una opción" />
                </Col>
                <Col span={12} md={6}>
                    <Select label="Buscable" options={OPTIONS} placeholder="Busca..." searchable />
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Cards</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12} md={4}>
                    <Card>
                        <CardHeader title="Default" />
                        <CardBody><Text variant="caption">Contenido de la card</Text></CardBody>
                        <CardFooter><Button variant={2} size="sm">Acción</Button></CardFooter>
                    </Card>
                </Col>
                <Col span={12} md={4}>
                    <Card variant="elevated">
                        <CardHeader title="Elevated" />
                        <CardBody><Text variant="caption">Sin borde, con sombra</Text></CardBody>
                    </Card>
                </Col>
                <Col span={12} md={4}>
                    <Card variant="outlined">
                        <CardHeader title="Outlined" />
                        <CardBody><Text variant="caption">Solo borde</Text></CardBody>
                    </Card>
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Tabs</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12}>
                    <Tabs defaultTab="planning">
                        <TabBar actions={<Button size="sm" variant={3}>+ New view</Button>}>
                            <Tab id="planning" badge={3}>Feature planning</Tab>
                            <Tab id="area">By area</Tab>
                            <Tab id="sprint">Current sprint</Tab>
                        </TabBar>
                        <TabPanel id="planning">
                            <Card style={{ margin: "16px 0" }}>
                                <CardBody><Text variant="caption">Contenido de Feature planning</Text></CardBody>
                            </Card>
                        </TabPanel>
                        <TabPanel id="area">
                            <Card style={{ margin: "16px 0" }}>
                                <CardBody><Text variant="caption">Contenido de By area</Text></CardBody>
                            </Card>
                        </TabPanel>
                        <TabPanel id="sprint">
                            <Card style={{ margin: "16px 0" }}>
                                <CardBody><Text variant="caption">Contenido de Current sprint</Text></CardBody>
                            </Card>
                        </TabPanel>
                    </Tabs>
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Table</Text>
            <Grid gap={16} style={{ marginBottom: 32 }}>
                <Col span={12}>
                    <Table>
                        <TableHead>
                            <Th>Nombre</Th>
                            <Th>Último commit</Th>
                            <Th align="right" shrink>Hace</Th>
                        </TableHead>
                        <TableBody>
                            <Tr>
                                <Td><TableCell icon={<Folder size={16} />}>.github/workflows</TableCell></Td>
                                <Td muted>Release/main v0.3.1</Td>
                                <Td align="right" muted shrink>4 días</Td>
                            </Tr>
                            <Tr>
                                <Td><TableCell icon={<Folder size={16} />}>backend</TableCell></Td>
                                <Td muted>Release/main v0.3.1</Td>
                                <Td align="right" muted shrink>4 días</Td>
                            </Tr>
                            <Tr>
                                <Td><TableCell icon={<Folder size={16} />}>frontend</TableCell></Td>
                                <Td muted>Release/main v0.3.1</Td>
                                <Td align="right" muted shrink>4 días</Td>
                            </Tr>
                            <Tr>
                                <Td><TableCell icon={<FileText size={16} />}>Dockerfile</TableCell></Td>
                                <Td muted>Release/main v0.1.10</Td>
                                <Td align="right" muted shrink>3 semanas</Td>
                            </Tr>
                            <Tr>
                                <Td><TableCell icon={<FileText size={16} />}>README.md</TableCell></Td>
                                <Td muted>Release/main v0.3.0</Td>
                                <Td align="right" muted shrink>4 días</Td>
                            </Tr>
                        </TableBody>
                    </Table>
                </Col>
            </Grid>

            <Text variant="body" as="h2" style={{ marginBottom: 12 }}>Modal</Text>
            <Button variant={1} onClick={() => setModal(true)}>Abrir modal</Button>

            <Modal open={modal} onClose={() => setModal(false)} title="Ejemplo de modal">
                <Text variant="body" style={{ marginBottom: 16 }}>
                    Contenido del modal. Se cierra con Escape o haciendo clic fuera.
                </Text>
                <Input label="Campo dentro del modal" placeholder="Escribe aquí..." />
                <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button variant={2} onClick={() => setModal(false)}>Cancelar</Button>
                    <Button variant={1} onClick={() => setModal(false)}>Confirmar</Button>
                </div>
            </Modal>
        </Page>
    )
}
