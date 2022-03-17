import { GetServerSidePropsContext, InferGetServerSidePropsType } from 'next';
import { useState } from 'react';
import { Col, Container, Image, Row } from 'react-bootstrap';
import AdminGlobalConfigurations from '../../../components/Admin/AdminGlobalConfigurations';
import CombatContainer from '../../../components/Admin/CombatContainer';
import DiceList, { PlayerName } from '../../../components/Admin/DiceList';
import NPCContainer from '../../../components/Admin/NPCContainer';
import AdminNavbar from '../../../components/AdminNavbar';
import DataContainer from '../../../components/DataContainer';
import ErrorToastContainer from '../../../components/ErrorToastContainer';
import GeneralDiceRoll from '../../../components/Modals/GeneralDiceRoll';
import PlayerAnnotationsField from '../../../components/Player/PlayerAnnotationField';
import useToast from '../../../hooks/useToast';
import prisma from '../../../utils/database';
import DiceRollResultModal from '../../../components/Modals/DiceRollResult';
import { sessionSSR } from '../../../utils/session';
import { ResolvedDice } from '../../../utils';
import PlayerManager from '../../../components/Admin/PlayerManager';
import useSocket, { SocketIO } from '../../../hooks/useSocket';
import { ErrorLogger, RetrieveSocket } from '../../../contexts';

export default function Admin1(props: InferGetServerSidePropsType<typeof getSSP>) {
    const [toasts, addToast] = useToast();
    const [generalDiceRollShow, setGeneralDiceRollShow] = useState(false);
    const [diceRoll, setDiceRoll] = useState<{ dices: string | ResolvedDice[], resolverKey?: string }>({ dices: '' });
    const [socket, setSocket] = useState<SocketIO | null>(null);

    useSocket(socket => {
        socket.emit('roomJoin', 'admin');
        setSocket(socket);
    });

    const players: PlayerName[] = props.players.map(player => {
        return {
            id: player.id, name: player.PlayerInfo.find(info => info.Info.name === 'Nome')?.value || 'Desconhecido'
        };
    });

    return (
        <>
            <AdminNavbar />
            <ErrorLogger.Provider value={addToast}>
                <RetrieveSocket.Provider value={socket}>
                    <Container>
                        <Row className='display-5 text-center'>
                            <Col>Painel do Administrador</Col>
                        </Row>
                        <Row className='my-4'>
                            <Col className='text-center h5'>
                                <AdminGlobalConfigurations environment={props.environment} />
                            </Col>
                        </Row>
                        <Row className='justify-content-center'>
                            {props.players.length === 0 ?
                                <Col className='h2 text-center' style={{ color: 'gray' }}>
                                    Não há nenhum jogador cadastrado.
                                </Col> :
                                <PlayerManager players={props.players} />}

                        </Row>
                        <Row className='my-3 text-center'>
                            <DataContainer xs={12} lg title='Rolagem'>
                                <Row className='mb-3 justify-content-center'>
                                    <Col xs={3}>
                                        <Row>
                                            <Col className='h5'>Geral</Col>
                                        </Row>
                                        <Row>
                                            <Image fluid src='/dice20.png' alt='Dado'
                                                className='clickable' onClick={() => setGeneralDiceRollShow(true)} />
                                        </Row>
                                    </Col>
                                </Row>
                            </DataContainer>
                            <CombatContainer players={players} />
                        </Row>
                        <Row className='my-3'>
                            <DiceList players={players} />
                            <NPCContainer />
                        </Row>
                        <Row className='my-3'>
                            <DataContainer outline title='Anotações' htmlFor='playerAnnotations'>
                                <PlayerAnnotationsField value={props.notes?.value} />
                            </DataContainer>
                        </Row>
                    </Container>
                </RetrieveSocket.Provider>
                <GeneralDiceRoll show={generalDiceRollShow} onHide={() => setGeneralDiceRollShow(false)}
                    showDiceResult={(dices, resolverKey) => setDiceRoll({ dices, resolverKey })} />
                <DiceRollResultModal dices={diceRoll.dices} resolverKey={diceRoll.resolverKey}
                    onHide={() => setDiceRoll({ dices: '', resolverKey: '' })} />
            </ErrorLogger.Provider>
            <ErrorToastContainer toasts={toasts} />
        </>
    );
}

async function getSSP(ctx: GetServerSidePropsContext) {
    const player = ctx.req.session.player;
    if (!player || !player.admin) {
        return {
            redirect: {
                destination: '/',
                permanent: false
            },
            props: {
                environment: null,
                players: [],
                notes: null
            }
        };
    }

    const results = await Promise.all([
        prisma.config.findUnique({
            where: { key: 'environment' }
        }),
        prisma.player.findMany({
            where: { role: 'PLAYER' },
            select: {
                id: true,
                PlayerAttributeStatus: { select: { AttributeStatus: true, value: true } },
                PlayerInfo: {
                    where: { Info: { name: { in: ['Nome'] } } },
                    select: { Info: true, value: true },
                },
                PlayerAttributes: { select: { Attribute: true, value: true, maxValue: true } },
                PlayerSpec: { select: { Spec: true, value: true } },
                PlayerEquipment: { select: { Equipment: true, currentAmmo: true } },
                PlayerItem: { select: { Item: true, currentDescription: true, quantity: true } }
            }
        }),
        prisma.playerNote.findUnique({
            where: { player_id: player.id },
            select: { value: true }
        }),
    ]);

    return {
        props: {
            environment: results[0],
            players: results[1],
            notes: results[2]
        }
    };
}

export const getServerSideProps = sessionSSR(getSSP);