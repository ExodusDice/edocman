package com.edocman.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
public class ClerkAuthFilter implements Filter {

    @Value("${clerk.simulation:true}")
    private boolean simulation;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        
        // Pass through non-API requests, static resources, and public API endpoints
        if (!path.startsWith("/api/") || 
            path.startsWith("/api/auth/register") || 
            path.startsWith("/api/payments/webhook") ||
            path.contains("/document/print") ||
            path.contains("/document/official")) {
            chain.doFilter(request, response);
            return;
        }

        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.getWriter().write("{\"error\": \"Unauthorized: Missing Bearer Token\"}");
            return;
        }

        String token = authHeader.substring(7);

        try {
            String userId;
            if (simulation) {
                // In simulation mode, the token is directly treated as the Clerk user ID
                userId = token;
            } else {
                // Decode the token and extract the Clerk user ID (the sub/subject claim)
                DecodedJWT jwt = JWT.decode(token);
                userId = jwt.getSubject();
            }

            if (userId == null || userId.trim().isEmpty()) {
                throw new Exception("Invalid user identifier in token");
            }

            UserContext.setCurrentUser(userId);
            try {
                chain.doFilter(request, response);
            } finally {
                UserContext.clear();
            }
        } catch (Exception e) {
            httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            httpResponse.setContentType("application/json");
            httpResponse.getWriter().write("{\"error\": \"Unauthorized: Invalid Token - " + e.getMessage() + "\"}");
        }
    }
}
