"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import { useEffect } from "react";

/* ================================================================ */
/* AJUSTAR MAPA                                                     */
/* ================================================================ */

function AjustarMapa({
  latitude,
  longitude,
  companionLatitude,
  companionLongitude,
}) {
  const map = useMap();

  useEffect(() => {
    const pontos = [];

    const lat = Number(latitude);
    const lon = Number(longitude);

    const clat = Number(companionLatitude);
    const clon = Number(companionLongitude);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lon)
    ) {
      pontos.push([lat, lon]);
    }

    if (
      Number.isFinite(clat) &&
      Number.isFinite(clon)
    ) {
      pontos.push([clat, clon]);
    }

    if (pontos.length === 1) {
      map.setView(pontos[0], 17);
    }

    if (pontos.length === 2) {
      map.fitBounds(pontos, {
        padding: [50, 50],
      });
    }
  }, [
    map,
    latitude,
    longitude,
    companionLatitude,
    companionLongitude,
  ]);

  return null;
}

/* ================================================================ */
/* ÍCONE ACOMPANHANTE                                               */
/* ================================================================ */

const companionIcon = L.divIcon({
  html: `
    <div
      style="
        width:42px;
        height:42px;
        border-radius:50%;
        background:#0066c0;
        border:4px solid white;
        box-shadow:0 3px 12px rgba(0,0,0,.30);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:21px;
      "
    >
      🏠
    </div>
  `,
  className: "",
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21],
});

/* ================================================================ */
/* ÍCONE PORTADOR                                                   */
/* ================================================================ */

const portadorIcon = L.divIcon({
  html: `
    <div
      style="
        width:42px;
        height:42px;
        border-radius:50%;
        background:#16a34a;
        border:4px solid white;
        box-shadow:0 3px 12px rgba(0,0,0,.30);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:21px;
      "
    >
      💙
    </div>
  `,
  className: "",
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21],
});

/* ================================================================ */
/* MAPA                                                             */
/* ================================================================ */

export default function MapaLocalizacao({
  latitude,
  longitude,
  companionLatitude,
  companionLongitude,
  geofence = 150,
  portadorNome = "Portador",
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  const clat = Number(companionLatitude);
  const clon = Number(companionLongitude);

  const temPortador =
    Number.isFinite(lat) &&
    Number.isFinite(lon);

  const temAcompanhante =
    Number.isFinite(clat) &&
    Number.isFinite(clon);

  const centerLat = temAcompanhante
    ? clat
    : lat;

  const centerLon = temAcompanhante
    ? clon
    : lon;

  /* ============================================================ */
  /* SEM GPS                                                       */
  /* ============================================================ */

  if (
    !Number.isFinite(centerLat) ||
    !Number.isFinite(centerLon)
  ) {
    return (
      <div
        style={{
          height: 380,
          width: "100%",
          borderRadius: 16,
          overflow: "hidden",
          background:
            "linear-gradient(135deg,#eff6ff,#f8fafc)",
          border: "1px solid #dbeafe",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 10,
          color: "#64748b",
          textAlign: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            fontSize: "3rem",
          }}
        >
          📡
        </div>

        <strong
          style={{
            color: "#334155",
          }}
        >
          Aguardando sinal de GPS...
        </strong>

        <span
          style={{
            fontSize: "0.85rem",
          }}
        >
          Permita a localização no navegador e aguarde a posição.
        </span>
      </div>
    );
  }

  const linha =
    temAcompanhante &&
    temPortador
      ? [
          [clat, clon],
          [lat, lon],
        ]
      : [];

  return (
    <div
      style={{
        width: "100%",
        height: 380,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #cbd5e1",
        boxShadow:
          "0 8px 25px rgba(15,23,42,.08)",
      }}
    >
      <MapContainer
        center={[centerLat, centerLon]}
        zoom={16}
        scrollWheelZoom={true}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <AjustarMapa
          latitude={latitude}
          longitude={longitude}
          companionLatitude={companionLatitude}
          companionLongitude={companionLongitude}
        />

        {/* CERCA VIRTUAL */}

        {temAcompanhante && (
          <Circle
            center={[clat, clon]}
            radius={Number(geofence) || 150}
            pathOptions={{
              color: "#0066c0",
              fillColor: "#0066c0",
              fillOpacity: 0.10,
              weight: 2,
            }}
          >
            <Popup>
              <strong>Cerca Virtual</strong>
              <br />
              Limite: {Number(geofence) || 150} metros
            </Popup>
          </Circle>
        )}

        {/* ACOMPANHANTE */}

        {temAcompanhante && (
          <Marker
            position={[clat, clon]}
            icon={companionIcon}
          >
            <Popup>
              <strong>🏠 Você</strong>
              <br />
              Localização do acompanhante
              <br />
              <small>
                Latitude: {clat.toFixed(6)}
                <br />
                Longitude: {clon.toFixed(6)}
              </small>
            </Popup>
          </Marker>
        )}

        {/* PORTADOR */}

        {temPortador && (
          <Marker
            position={[lat, lon]}
            icon={portadorIcon}
          >
            <Popup>
              <strong>
                💙 {portadorNome}
              </strong>
              <br />
              Localização do portador
              <br />
              <small>
                Latitude: {lat.toFixed(6)}
                <br />
                Longitude: {lon.toFixed(6)}
              </small>
            </Popup>
          </Marker>
        )}

        {/* LINHA ENTRE OS DOIS */}

        {linha.length === 2 && (
          <Polyline
            positions={linha}
            pathOptions={{
              color: "#64748b",
              weight: 3,
              dashArray: "8 8",
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}