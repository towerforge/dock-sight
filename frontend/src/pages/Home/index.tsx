import { useState } from "react"
import { SidebarLayout } from "@/layouts/SidebarLayout"
import { Button, Input, Select, Card, CardHeader, CardBody, CardFooter, Grid, Col, Text, Modal, Page } from "@/components/ui"

const OPTIONS = [
    { value: "1", label: "Opción 1" },
    { value: "2", label: "Opción 2" },
    { value: "3", label: "Opción 3" },
]

function HomeSidebar() {
    return (
        <>
            <Text variant="title" style={{ fontSize: 14, marginBottom: 16 }}>Panel</Text>
            <Input placeholder="Buscar..." style={{ marginBottom: 12 }} />
            <Card variant="filled" style={{ marginBottom: 8 }}>
                <CardBody><Text variant="caption">Elemento 1</Text></CardBody>
            </Card>
            <Card variant="filled" style={{ marginBottom: 8 }}>
                <CardBody><Text variant="caption">Elemento 2</Text></CardBody>
            </Card>
            <Card variant="filled">
                <CardBody><Text variant="caption">Elemento 3</Text></CardBody>
            </Card>
        </>
    )
}

export default function Home() {
    const [modal, setModal] = useState(false)

    return (
        <SidebarLayout sidebar={<HomeSidebar />}>
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
        </SidebarLayout>
    )
}
